/* ഓം ബ്രഹ്മാർപ്പണം. */

/*
 * thoolika.js
 * Created: Thu Mar 16 2017 16:13:46 GMT+0530 (IST)
 * Copyright 2017 Harish.K<harish2704@gmail.com>
 */

/* global angular, _, feathers, Primus, localStorage, $thoolikaConfig, $, window, confirm */

function logSucess(data) { window.gg = arguments; window.gg1 = data; console.log('Success: ', data); }
function logError(err) { window.ee = err; console.log('Error: ', err); }
function log(promise) { promise.then(logSucess).catch(logError); }

var API_BASE = '../api/';
function Query(args) {
  args.dataType = 'json';
  return $.ajax( args )
    .then( function(res){
      return res.data;
    });
}

function Api(name) {
    this.name = name;
}
Api.prototype.get = function(id) {
    return Query({
        method: 'GET',
        url: API_BASE + this.name + '/' + id
    });
};

Api.prototype.create = function(data) {
  return Query({
    method: 'POST',
    url: API_BASE + this.name,
    data: data
  });
};
Api.prototype.find = function(query) {
  return Query({
    method: 'GET',
    url: API_BASE + this.name,
    data: query
  });
};

Api.prototype.update = function( id, data ){
  return Query({
      method: 'PATCH',
      url: API_BASE + this.name + '/' + id,
      data: data
  });
};

Api.prototype.remove = function( id ){
  return Query({
      method: 'DELETE',
      url: API_BASE + this.name + '/' + id,
  });
};

var adminApp = {
  service: function( name ){
    return new Api( name );
  },
  entities: {},
  getEntities: function(){
    var self = this;
    this.task = new Api( 'core.entity')
    .find()
    .then(function( items ){
      items.forEach( function(item){
        self.entities[ item.name ] = item;
      }, self );
      return items;
    });
    return this.task;
  },
  getEntity: function( name ){
    return this.task.then( function(){
      return adminApp.entities[name];
    });
  }
};

var states = [
  {
    name: 'taHome',
    url: '/',
    controller: 'taHomeCtrl',
    resolve:{
      entities: function(){ return adminApp.getEntities(); },
    },
    templateUrl: 'thoolika-admin/home.html'
  },
  {
    name: 'taList',
    parent: 'taHome',
    url: 'entities/:entityType',
    controller: 'taListCtrl',
    templateUrl: 'thoolika-admin/list.html'
  },
  {
    name: 'taEdit',
    parent: 'taHome',
    url: 'entities/:entityType/:entityId/edit',
    controller: 'taEditCtrl',
    resolve:{
      entity: [ '$stateParams', function( $stateParams ){
        return adminApp.getEntity( $stateParams.entityType );
      }],
      item: [ '$stateParams', function( $stateParams ){
        if( $stateParams.entityId === '$new' ){
          return {};
        }
        return adminApp.service( $stateParams.entityType ).get( $stateParams.entityId );
      } ],
    },
    templateUrl: 'thoolika-admin/edit.html'
  }
];




angular.module('thoolika.admin', ['schemaForm', 'ui.router', 'ui.bootstrap', 'asf.bs-extra', 'ui-notification' ])
  .config(['$stateProvider','$urlRouterProvider', function( $stateProvider, $urlRouterProvider ){
    $urlRouterProvider.otherwise('/');
    states.forEach( function( state ){
      $stateProvider.state( state );
    });
  }])
  .run([ '$rootScope', function( $rootScope){
    $rootScope.$thoolikaConfig = $thoolikaConfig;
  }])
.service( 'EntityInfo', function(){
  this.cache = {};

  this.get = function( type ){
    if( !this.cache[type] ){
      this.cache[type] = adminApp.service('core.entity').get( type );
    }
    return this.cache[type];
  };
})
  .run(['bseDataSource', '$q', function(bseDataSource, $q){
    bseDataSource.addSource( 'default', function( ref, str ){
      var query = {};
      if( str instanceof Array ){
        query[ref.valueKey] = { $in: str };
        query.$limit = str.length;
      }else{
        query[ref.foreignKey] = { $regex: str, $options: 'i' };
      }
      return $q.resolve()
      .then( function(){
        return adminApp.service( ref.entity ).find({ query: query });
      });
    });
  }])
  .service('DbService',[ '$location', '$q', 'Notification', '$state', function($location, $q, Notification, $state ){

    function getPaginationData( total, limit, skip, opts  ){
      opts = Object.assign({
        listLength: 3,
        activeClass: 'active',
        inactiveClass: 'inactive',
      }, opts );
      var pageNumber = Math.floor( skip/limit )+1;
      var listLength = opts.listLength;
      var range = [];
      var carry = 0, i;
      var pageCount = Math.ceil(total / limit);
      var start = pageNumber - listLength ;
      if (start < 1 ){
        start = 1;
        carry = listLength - pageNumber + 1;
      }
      var end =  (pageNumber + listLength  + carry);
      if (end > pageCount  ){
        carry = pageNumber + listLength  - pageCount;
        end = pageCount;
        start = (start - carry ) < 1 ? 1 : (start - carry);
      }
      for ( i=start; i <= end ; i++) {
        range.push({
          page: i,
          class: i === pageNumber? opts.activeClass : opts.inactiveClass,
        });
      }
      return {
        next : ( pageNumber < pageCount ? pageNumber + 1 : null ),
        prev : ( pageNumber > 1 ? pageNumber - 1 : null ),
        currentPage : pageNumber,
        range : range,
        totalPages : pageCount,
        totalItems : total,
        limit : limit,
        offset : skip,
      };
    }


    function assignPagination( res, scopeVar ){
      var paginationData = getPaginationData( res.total, res.limit, res.skip );
      Object.assign( scopeVar, paginationData );
    }

    function fillArray ( arr, items ){
      arr.splice(0);
      items.forEach( function(v){ arr.push(v); });
    }


    this.getSearchParams = function(){
      var search = $location.search();
      var out = {};
      Object.keys( search ).forEach( function(key){
        if( search[key] ){
          out[key] = this.decodeParams(search[key]);
        }
      }, this );
      return out;
    };

    this.setSearchParams = function( args ){
      $location.search({});
      Object.keys(args).forEach( function(key){
        $location.search( key, this.encodeParams(args[key]) );
      }, this );
    };

    this.decodeParams = function( obj ){
      return JSON.parse( decodeURIComponent(obj));
    };
    this.encodeParams = function( obj ){
      return encodeURIComponent(JSON.stringify(obj));
    };

    this.loadData = function( $stateParams ){
      var clientsideParams = this.getSearchParams();
      var query = {};
      var params = {
        query: query
      };
      Object.keys( clientsideParams ).forEach(function(key){
        if( key[0] === '$' ){
          params[ key.slice(1) ] = clientsideParams[key];
        } else {
          query[key] = clientsideParams[key];
        }
      });
      return $q.resolve()
      .then(function(){
        return adminApp.service( $stateParams.entityType ).find( params );
      });
    };

    this.loadDataToArray = function( $stateParams, itemsVar, paginationVar ){
      return this.loadData( $stateParams )
      .then( function( data ){
        fillArray( itemsVar, data.items );
        assignPagination( data, paginationVar );
      });
    };

    function saveNewData( entityType, entityId, record ){
      return adminApp.service(entityType).create( record )
      .then( function( newRecord ){
        Notification.success('Created successfully');
        $state.go('taEdit', { entityType: entityType, entityId: newRecord._id });
      });
    }

    function updateData( entityType, entityId, record ){
      return adminApp.service( entityType ).update( entityId, record )
      .then( function( ){
        Notification.success('Saved successfully');
      });
    }


    this.deleteRecord = function( entityType, record ){
      var sure = confirm('Are you sure??');
      if( sure ){
        return adminApp.service( entityType ).remove( record._id )
          .then( function(){
            Notification.success('Item removed successfully');
          })
          .catch( function(err){
            console.log( err );
            Notification.error('Error saving data');
          });
      }
      return $q.reject('Cancelled');
    };

    this.saveData = function( entityType, entityId, record ){
      var task =  entityId === '$new'? saveNewData( entityType, entityId, record ) : updateData( entityType, entityId, record );
      return task
        .catch( function(err){
          console.log( err );
          Notification.error('Error saving data');
        });
    };

  }])
  .controller('taListCtrl', [ '$scope', '$stateParams', 'DbService', function( $scope, $stateParams, DbService ){
    var items = [];
    var query = DbService.getSearchParams();

    $scope.sort = query.$sort || {};
    $scope.filter = {};
    Object.keys( query ).forEach( function( key ){
      $scope.filter[key] = query[key].$regex || query[key];
    });
    $scope.entityType = $stateParams.entityType;
    $scope.items = items;
    $scope.pagination = {};
    $scope.$parent.activeEntity = _.find( $scope.entities, { name: $scope.entityType } );

    function reload(){
      DbService.loadDataToArray( $stateParams, items, $scope.pagination );
    }

    $scope.gotoPage = function( page ){
      query.$skip = ( page - 1 ) * $scope.pagination.limit;
      DbService.setSearchParams( query );
      reload();
    };

    $scope.getSortIcon = function( col ){
      var out;
      switch ( $scope.sort[col]){
        case 1:
          out = 'glyphicon-chevron-down';
          break;
        case -1:
          out = 'glyphicon-chevron-up';
          break;
        default:
          out = 'glyphicon-sort';
      }
      return out;
    };

    $scope.applyFilter = function( col ){
      var filter = $scope.filter;
      var str = filter[col];
      if( str === undefined ){
        delete query[col];
      } else {
        query[col] = { $regex: str, $options: 'i' };
      }
      DbService.setSearchParams( query );
      reload();
    };


    $scope.applySort = function( col, isAsc ){
      var sort = $scope.sort;

      switch ( isAsc ){
        case undefined:
          delete sort[col];
          break;
        case true:
          sort[col] = 1;
          break;
        case false:
          sort[col] = -1;
          break;
      }

      if( Object.keys( sort ).length ){
        query.$sort = sort;
      } else {
        delete query.$sort;
      }
      DbService.setSearchParams( query );
      reload();
    };

    $scope.deleteRecord = function( item ){
      DbService.deleteRecord( $scope.entityType, item )
      .then(function(){
        reload();
      });
    };

    reload();
  }])
  .controller('taHomeCtrl', [ '$scope', 'entities', '$stateParams', function( $scope, entities, $stateParams ){
    $scope.entities = entities;
    $scope.activeEntity = $stateParams.entityType? _.find( entities, { name: $stateParams.entityType } ): entities[0];

    $scope.setActiveTab = function( item ){
      $scope.activeEntity = item;
    };
  }])
  .controller('taEditCtrl', [ '$scope', 'DbService', 'entity', '$state', '$stateParams', 'item', 'Notification', function( $scope, DbService, entity, $state, $stateParams, item, Notification ){
    var entityType = $stateParams.entityType;
    var entityId = $stateParams.entityId;
    Object.assign( $scope, entity );

    $scope.formDef = entity.defaultForm.formDef;
    $scope.schemaDef = entity.defaultForm.schemaDef;

    $scope.previewTarget = false;
    $scope.record = item;
    $scope.$parent.activeEntity = _.find( $scope.entities, { name: $stateParams.entityType } );

    var modelWatcher = _.debounce(function(){
      if($scope.previewTarget ){
        console.log( 'Called preview');
        window.open(
          'http://127-0-0-1.org.uk/v1/__preview-frame?name=' +
          $scope.previewTarget +
          '&data=' +
          encodeURIComponent(JSON.stringify( $scope.record )),
          'window',
          'toolbar=yes,scrollbars=yes,resizable=yes'
        );
      }
    }, 500 );
    $scope.$watch('record', function(){
      console.log( 'Calling preview');
      modelWatcher();
    }, true );

    $scope.deleteRecord = function(){
      DbService.deleteRecord( entityType, $scope.record )
      .then( function(){
        window.history.back();
      });
    };

    $scope.saveData = function(){
      DbService.saveData( entityType, entityId, $scope.record )
      .then( function(){
        $scope.mainForm.$setPristine();
      });
    };

  }])
  .directive('taOnEnter', function () {
    return function (scope, element, attrs) {
        element.bind('keydown keypress', function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.taOnEnter);
                });
                event.preventDefault();
            }
        });
    };
});



/* ഓം ബ്രഹ്മാർപ്പണം. */

/*
 * index.js
 * Created: Thu Mar 16 2017 16:13:34 GMT+0530 (IST)
 * Copyright 2017 Harish.K<harish2704@gmail.com>
 */

var debug = require('debug')('Thoolika-admin-angular:debug');


exports.setup = function( app ){
  debug('Adding /admin route');
  app.get( '/admin', function( req, res ){
    return res.render('core/admin/index');
  });
};

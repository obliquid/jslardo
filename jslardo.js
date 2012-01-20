/**
 * jslardo - a social cms based on node.js
 *
 *
 * Copyright (C) 2011 Federico Carrara (federico@obliquid.it)
 *
 * For more information http://obliquid.org/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */



/**
 * Module dependencies.
 */

var express = require('express'); //non devo mettere il './' perchè si tratta di un modulo, e non di un file da importare
//var mongoose = require('mongoose');
var connectTimeout = require('connect-timeout');



//create express server
//var app = module.exports = express.createServer();
var app = express.createServer();


//configurazioni comuni dell'app 
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' })); //attivo il logger di Express
	app.use(express.bodyParser()); //serve a popolare la variabile req.body (per esempio con tutto ciò che gli arriva in POST dai form)
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'topsecret' }));
	app.use(connectTimeout({ time: 120000 })); //2 minuti
	//non lo uso... app.use(express.methodOverride()); //serve per poter usare nei form: <input type="hidden" name="_method" value="put" />, e quindi app.put('/', function(){ console.log(req.body.user); res.redirect('back');});
	
	//appendo mongoose
	app.mongoose = require('mongoose');
	
	//importo il necessario per jslardo
	app.jsl = {};
	app.jsl.config = require('./config').jslardo_config;
	app.jsl.crypto = require('crypto');
	
	//configuro i18n
	app.i18n = require("./core/i18n");
	app.i18n.configure({
		// setup some locales - other locales default to en silently
		locales: app.jsl.config.locales,
		defaultLocale: app.jsl.config.defaultLocale
	});
    app.use(app.i18n.init);
	
	//carico i moduli core di jslardo
	//models
	app.jsl.models = require('./core/models');
	//permissions
	app.jsl.perm = require('./core/permissions');
	//sessions
	app.jsl.sess = require('./core/sessions');
	//pagination
	app.jsl.pag = require('./core/pagination');
	//utils
	app.jsl.utils = require('./core/utils');
	//routes
	app.jsl.routes = require('./core/routes');
	
	//init router
	app.use(app.router);
	//declare public dir
	app.use(express.static(__dirname + '/public'));
	
	// Routes
	//nota: le route sono importate, prima quelle di jslardo, poi quelle per ciascuno degli oggetti persistenti nel db
	
	//route miscellanee di jslardo
	app.jsl.routes.defineRoutes(app);
	
	//route per gli elementi della struttura
	require('./controllers/user').defineRoutes(app);
	require('./controllers/role').defineRoutes(app);
	require('./controllers/module').defineRoutes(app);
	require('./controllers/debuggin').defineRoutes(app);
	//per questi elementi oltre alle route, mi servono anche altri metodi esposti dal controller, quindi devo tenere tutto il controller
	app.jsl.pageController = require('./controllers/page');
	app.jsl.pageController.defineRoutes(app);
	app.jsl.siteController = require('./controllers/site');
	app.jsl.siteController.defineRoutes(app);
	//app.jsl.elementController = require('./controllers/element');
	//app.jsl.elementController.defineRoutes(app);
	app.jsl.contentController = require('./controllers/content');
	app.jsl.contentController.defineRoutes(app);
	app.jsl.divController = require('./controllers/div');
	app.jsl.divController.defineRoutes(app);
	app.jsl.fieldController = require('./controllers/field');
	app.jsl.fieldController.defineRoutes(app);
	app.jsl.jslModelController = require('./controllers/jslModel');
	app.jsl.jslModelController.defineRoutes(app);

	//Static Helpers
	app.helpers({
		encURI: function(content){ return encodeURIComponent(content) },
		decURI: function(content){ return decodeURIComponent(content) },
		esc: function(content){ return escape(content) },
		uesc: function(content){ return unescape(content) },
		trunc: app.jsl.utils.trunc,
		drawSchema: app.jsl.jslModelController.drawSchema
	});
	
	//Dynamic Helpers
	app.dynamicHelpers({
		session: function (req, res) {
			return req.session;
		},
		app: function (req, res) {
			return req.app;
		},
		req: function (req, res) {
			return req;
		},
		res: function (req, res) {
			return res;
		},
		__i: function (req, res) {
			if ( req.cookies && req.cookies.currentlocale ) app.i18n.setLocale(req.cookies.currentlocale);
			return app.i18n.__;
		},
		__n: function (req, res) {
			if ( req.cookies && req.cookies.currentlocale ) app.i18n.setLocale(req.cookies.currentlocale);
			return app.i18n.__n;
		}
	});
	
});

//configurazioni dell'app differenziate in base alla modalità del server (sviluppo/produzione)
app.configure('development', function(){
	//aumento il livello di debug
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	//livello di debug al minimo
	app.use(express.errorHandler()); 
});





//DB connection
app.mongoose.connect('mongodb://localhost/jslardo');

//carico i modelli del DB, e li salvo a livello di app
app.jsl.models.defineModels(app.mongoose, app, function() {
	app.jsl.user = app.mongoose.model('user');
	app.jsl.role = app.mongoose.model('role');
	app.jsl.site = app.mongoose.model('site');
	//app.jsl.element = app.mongoose.model('element');
	app.jsl.page = app.mongoose.model('page');
	app.jsl.div = app.mongoose.model('div');
	app.jsl.jslModel = app.mongoose.model('jslModel');
	app.jsl.module = app.mongoose.model('module');
	app.jsl.debuggin = app.mongoose.model('debuggin');
	//console.log("finito coi modelli!");
})




//attivo l'applicazione Express
app.listen(app.jsl.config.port, app.jsl.config.ip);
console.log("jslardo server listening on port %d in %s mode", app.address().port, app.settings.env);




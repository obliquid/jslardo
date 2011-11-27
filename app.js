/**
 * jslardo - model data and publish it
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
var mongoose = require('mongoose');
var models = require('./models');
//serve? var connect = require('connect');
var connectTimeout = require('connect-timeout');
var mongoStore = require('connect-mongodb');
var butter = require('./butter');
//var RedisStore = require('connect-redis')(express);
var app = module.exports = express.createServer();

//configurazioni comuni
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' })); //attivo il logger di Express
	app.use(express.bodyParser()); //serve a popolare la variabile req.body (per esempio con tutto ciò che gli arriva in POST dai form)
	app.use(express.cookieParser());
	app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'topsecret' }));
	app.use(connectTimeout({ time: 120000 })); //2 minuti
	//non lo uso... app.use(express.methodOverride()); //serve per poter usare nei form: <input type="hidden" name="_method" value="put" />, e quindi app.put('/', function(){ console.log(req.body.user); res.redirect('back');});
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	//appendo butter all'app express
	app.butter = butter;
});

//configurazioni differenziate in base alla modalità del server (sviluppo/produzione)
app.configure('development', function(){
	//aumento il livello di debug
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	//livello di debug al minimo
	app.use(express.errorHandler()); 
});





//DB connection
mongoose.connect('mongodb://localhost/butter');

//carico i modelli del DB, e li salvo a livello di app
models.defineModels(mongoose, function() {
	app.user = mongoose.model('user');
	app.project = mongoose.model('project');
	//console.log("finito coi modelli!");
})



//Helpers

//questo serve per passare a jade le sessions
app.dynamicHelpers({
    session: function (req, res) {
        return req.session;
    }
});




// Routes
//nota: le route sono importate, prima quelle di butter, poi quelle per ciascuno degli oggetti persistenti nel db

//route specifiche di butter
app.butter.defineRoutes(app);

//route per gli oggetti del db
var userController = require('./controllers/user');
userController.defineRoutes(app);
var projectController = require('./controllers/project');
projectController.defineRoutes(app);

/*queste non riesco a farle andare...
//per ultime le route per le pagine di errore, se nessuna altra route è stata matchata
//app.butter.defineRoute404(app);
app.error(function(err, req, res){
	app.butter.errorPage(res, "404 not found: "+req.path);	
	//res.send("fica");
});
*/


//attivo l'applicazione Express
app.listen(8222);
console.log("Butter server listening on port %d in %s mode", app.address().port, app.settings.env);




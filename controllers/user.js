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














/*
USER
*/

function defineRoutes(app) {

	//GET: user list
	//nota: per ora non richiede permessi, tutti possono visualizzare la lista utenti, in cui però compariranno solo gli utenti "public"
	app.get('/users/:page?', app.jsl.perm.readStrucPermOn_users, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli user dal db, e assegno il result al tpl
			//se sono superadmin vedo anche i non public
			//console.log(req.session.user_id);
			//var conditions = ( req.session.user_id == 'superadmin' ) ? {} : { 'status': 'public' };
			var conditions = ( req.session.user_id == 'superadmin' ) 
			? 
			{} 
			: 
			{ $or: [
					{ 'status': 'public' }, 
					{'_id': req.session.user_id }
			]};
			
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.user.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.user.find(
							conditions,
							[], 
							{ 
								sort: ['created', 'descending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, users) {
								res.render('users/list', { 
									elementName: 'user',
									elements: users,
									total: total,
									pagination: app.jsl.pag.paginationDo(req, total, '/users/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "GET: user list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: user detail 
	app.get('/users/:id', app.jsl.perm.readStrucPermOn_users, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//leggo il mio user dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non public
		//var conditions = ( req.session.user_id == 'superadmin' ) ? { '_id': req.params.id } : { '_id': req.params.id,  'status': 'public' };
		
		//solo per gli utenti, posso sempre vedere il dettaglio del mio user, oppure posso vedere quelli public
		var conditions = ( req.params.id == req.session.user_id || req.session.user_id == 'superadmin' ) ? { '_id': req.params.id } : { '_id': req.params.id,  'status': 'public' };
		app.jsl.user.findOne(
			conditions,
			[], 
			{},	
			function(err, user) {
				//console.log(user);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un utente col mio id e status: public,
					//in questo caso ritorna uno user null, quindi devo controllare se esiste lo user, altrimenti rimando in home
					if ( user )
					{
						//trovo anche gli ultimi models per il mio user
						//prima di chiamare il getRecords, devo aggiungere dei parametri che si aspetta
						//req.params.modelId = jslModel._id;
						req.session.skip = 0;
						req.session.limit = 1000; //in pratica per ora non pongo limite
						//console.log('jepasso: '+req.params.modelId);
						app.jsl.jslModelController.getRecords(app,req,res,{author: user._id},function(jslModels,totalModels){
							//trovo anche gli ultimi sites per il mio user
							//prima di chiamare il getRecords, devo aggiungere dei parametri che si aspetta
							//req.params.modelId = jslModel._id;
							req.session.skip = 0;
							req.session.limit = 1000; //in pratica per ora non pongo limite
							//console.log('jepasso: '+req.params.modelId);
							app.jsl.siteController.getRecords(app,req,res,{author: user._id},function(sites,totalSites){
								//finally, renderizzo sto detail
								res.render('users/detail', { 
									elementName: 'user',
									element: user,
									jslModels: jslModels,
									totalModels: totalModels,
									sites: sites,
									totalSites: totalSites
									
								});
							});
						});
					}
					else
					{
						//non esiste un utente public col mio id, quindi torno in home
						//app.jsl.utils.errorPage(res, err, "GET: user detail: user not found");
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: user detail: query error");
				}
			}
		);	
	});
	
	//GET: user register (new)
	//nota: qui avrei dovuto controllare s
	app.get('/users/edit/new', app.jsl.perm.readStrucPermOn_users, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('users/form', { 
			title: app.i18n.t(req,'create new user'),
			elementName: 'user',
			element: ''
		});	
	});
	//POST: user form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/users/edit', app.jsl.perm.readStrucPermOn_users, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima verifico se la email non è già stata usata
		app.jsl.user.findOne(
			{ 'email': req.body.email },
			function(err, user) {
				if ( user ) 
				{
					//email già usata
					app.jsl.utils.errorPage(res, err, "already exists user with email: "+req.body.email);
				}
				else
				{
					//email libera
					//creo nuovo user
					var my_user = new app.jsl.user();
					//popolo il mio user con quanto mi arriva dal form
					app.jsl.utils.populateModel(my_user, req.body);
					//inizializzo la data di creazione (che non è gestita dal form)
					my_user.created = new Date();
					//encripto la pw (lo faccio solo perchè è un new)
					my_user.password = app.jsl.sess.hashPw(req, my_user.password);
					//elimino il campo retype_password che mi arriva dal form e che non voglio avere nel db
					delete my_user.retype_password;
					//salvo il nuovo user
					my_user.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio user nuovo
							//forzo il suo login per comodità
							//console.log("setSignedIn con req = "+req);
							//console.log("e con my_user.id = "+my_user.id);
							app.jsl.sess.setSignedIn(req, my_user.id);
							//e rimando nel form
							res.redirect('/users/edit/'+my_user.id+'/success');
						}
						else
						{
							app.jsl.utils.errorPage(res, err, "POST: user form: saving user");
						}
					});
				}
			}
		);	
	});	
	
	//GET: user form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	//nota che per gli user un utente può sempre e solo modificare se stesso (ModifyMyself), a differenza di tutti gli altri elementi
	//della struttura in cui un utente può modificare i suoi elementi (Modify)
	app.get('/users/edit/:id/:msg?', app.jsl.perm.readStrucPermOn_users, app.jsl.perm.needStrucPermModifyMyself, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio user dal db, e assegno il result al tpl
		app.jsl.user.findOne(
			{ '_id': req.params.id },
			function(err, user) {
				if (!err)
				{
					res.render('users/form', { 
						title: app.i18n.t(req,'modify user'),
						elementName: 'user',
						element: user,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: user form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: user form (modify)
	app.post('/users/edit/:id', app.jsl.perm.readStrucPermOn_users, app.jsl.perm.needStrucPermModifyMyself, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima trovo il mio user da modificare nel db
		app.jsl.user.findOne(
			{ '_id': req.params.id },
			function(err, user) {
				if (!err)
				{
					//ho trovato lo user da modificare
					//prima di popolare lo user controllo che, se l'utente sta cambiando email, non scelga un'email già usata
					//(in patica cerco uno user che abbia la mia stessa email, ma un id differente: se lo trovo, vuol dire che la mail è già stata usata)
					app.jsl.user.findOne(
						{ 'email': req.body.email, '_id': { $ne : req.body.id } },
						function(err, userSameMail) {
							if ( userSameMail ) 
							{
								//email già usata
								app.jsl.utils.errorPage(res, err, "already exists user with email: "+req.body.email);
							}
							else
							{
								//la nuova email è valida, posso procedere
								//popolo il mio user con quanto mi arriva dal form
								app.jsl.utils.populateModel(user, req.body);
								//se mi arriva una password vuota, non devo salvarla. la salvo solo se non è vuota, perchè è l'utente che sta impostando una nuova password
								if ( typeof user.new_password !== "undefined" && user.new_password != '' )
								{
									//encripto la pw
									user.password = app.jsl.sess.hashPw(req, user.new_password);
								}
								//elimino property che arrivano dal form ma che non voglio finiscano nel db
								delete user.new_password; 
								delete user.retype_new_password; 
								
								//salvo lo user modificato e rimando nel form
								user.save(function(err) {
									res.redirect('/users/edit/'+user.id+'/success');
								});
							}
						}
					);
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: user form (modify): user not found on db");
				}
			}
		);
	});
	
	//GET: user delete
	app.get('/users/delete/:id', app.jsl.perm.readStrucPermOn_users, app.jsl.perm.needStrucPermModify, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//cancello l'utente
		app.jsl.user.remove(
			{ '_id': req.params.id },
			function(err, user) {
				if ( err ) app.jsl.utils.errorPage(res, err, 'GET: user delete: failed query on db');
			}
		);
		//QUI!!!: oltre a user, vanno cancellati anche tutti i suoi elementi dipendenti
		//faccio un redirect sulla lista
		res.redirect('/users');
	});
		
	
}

exports.defineRoutes = defineRoutes; 

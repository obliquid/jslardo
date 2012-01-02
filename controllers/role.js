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
role
*/

function defineRoutes(app) {

	//GET: role list
	app.get('/roles/:page?', app.jsl.readStrucPermDefault, app.jsl.paginationInit, function(req, res, next){
		app.jsl.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli role dal db, e assegno il result al tpl
			//se sono superadmin vedo anche i non share
			if ( req.session.filterAllOrMine == 'mine' )
			{
				//il superuser e gli utenti non loggati non possono filtrare per 'mine' o 'all', quindi se sto filtrando so che non sono superuser e so che sono loggato
				var conditions = {'author': req.session.user_id };
			}
			else
			{
				var conditions = ( req.session.user_id == 'superadmin' ) 
				? 
				{} 
				: 
				{ $or: [
						{ 'status': 'share' }, 
						{'author': req.session.user_id }
				]};
			}
			
			
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.role.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.role.find(
							conditions,
							[], 
							{ 
								sort: ['title', 'ascending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, roles) {
								res.render('roles/list', { 
									elementName: 'role',
									elements: roles,
									pagination: app.jsl.paginationDo(req, total, '/roles/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.errorPage(res, err, "GET: role list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: role detail 
	app.get('/roles/:id', app.jsl.readStrucPermDefault, function(req, res, next){
		app.jsl.routeInit(req);
		//leggo il mio role dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.role
			.findOne( conditions )
			.populate('author')
			.run(function(err, role) {
				//console.log(role);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un role col mio id e status: share,
					//in questo caso ritorna uno role null, quindi devo controllare se esiste lo role, altrimenti rimando in home
					if ( role )
					{
						res.render('roles/detail', { 
							elementName: 'role',
							element: role
						});	
					}
					else
					{
						//non esiste un role share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: role detail: query error");
				}
			});	
	});
	
	//GET: role form (new)
	app.get('/roles/edit/new', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('roles/form', { 
			title: app.i18n.t(req,'create new role'),
			elementName: 'role',
			element: ''
		});	
	});
	//POST: role form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/roles/edit', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//creo nuovo role
		var my_role = new app.jsl.role();
		//popolo il mio role con quanto mi arriva dal form
		app.jsl.populateModel(my_role, req.body);
		//assegno l'author (non gestito dal form ma impostato automaticamente)
		my_role.author = req.session.user_id;
		//inizializzo la data di creazione (che non è gestita dal form)
		my_role.created = new Date();
		//salvo il nuovo role
		my_role.save(function (err) {
			if (!err) 
			{
				//ho creato con successo il mio role nuovo
				//e rimando nel form
				res.redirect('/roles/edit/'+my_role.id+'/success');
			}
			else
			{
				app.jsl.errorPage(res, err, "POST: role form: query error saving role");
			}
		});
	});	
	
	//GET: role form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/roles/edit/:id/:msg?', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnRoleId, function(req, res, next){
		app.jsl.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio role dal db, e assegno il result al tpl
		app.jsl.role.findOne(
			{ '_id': req.params.id },
			function(err, role) {
				if (!err)
				{
					res.render('roles/form', { 
						title: app.i18n.t(req,'modify role'),
						elementName: 'role',
						element: role,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: role form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: role form (modify)
	app.post('/roles/edit/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnRoleId, function(req, res, next){
		app.jsl.routeInit(req);
		//prima trovo il mio role da modificare nel db
		app.jsl.role.findOne(
			{ '_id': req.params.id },
			function(err, role) {
				if (!err)
				{
					//ho trovato lo role da modificare
					//popolo il mio role con quanto mi arriva dal form
					app.jsl.populateModel(role, req.body);
					//salvo lo role modificato e rimando nel form
					role.save(function(err) {
						res.redirect('/roles/edit/'+role.id+'/success');
					});
				}
				else
				{
					app.jsl.errorPage(res, err, "POST: role form (modify): role not found on db");
				}
			}
		);
	});
	
	//GET: role delete
	app.get('/roles/delete/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnRoleId, function(req, res, next){
		app.jsl.routeInit(req);
		//cancello l'role
		app.jsl.role.remove(
			{ '_id': req.params.id },
			function(err, role) {
				if ( err ) app.jsl.errorPage(res, err, 'GET: role delete: failed query on db');
			}
		);
		//QUI!!!: oltre all'role, vanno cancellati anche tutti i suoi elementi dipendenti
		//faccio un redirect sulla lista
		res.redirect('/roles');
	});
		
	
}

exports.defineRoutes = defineRoutes; 

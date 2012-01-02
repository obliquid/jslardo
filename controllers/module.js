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
module
*/

function defineRoutes(app) {

	/*
	//GET: module list
	app.get('/modules/:page?', app.jsl.readStrucPermDefault, app.jsl.paginationInit, function(req, res, next){
		app.jsl.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli module dal db, e assegno il result al tpl
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
			app.jsl.module.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.module.find(
							conditions,
							[], 
							{ 
								sort: ['title', 'ascending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, modules) {
								res.render('modules/list', { 
									elementName: 'module',
									elements: modules,
									pagination: app.jsl.paginationDo(req, total, '/modules/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.errorPage(res, err, "GET: module list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: module detail 
	app.get('/modules/:id', app.jsl.readStrucPermDefault, function(req, res, next){
		app.jsl.routeInit(req);
		//leggo il mio module dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.module
			.findOne( conditions )
			.populate('author')
			.run(function(err, module) {
				//console.log(module);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un module col mio id e status: share,
					//in questo caso ritorna uno module null, quindi devo controllare se esiste lo module, altrimenti rimando in home
					if ( module )
					{
						res.render('modules/detail', { 
							elementName: 'module',
							element: module
						});	
					}
					else
					{
						//non esiste un module share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: module detail: query error");
				}
			});	
	});
	
	//GET: module form (new)
	app.get('/modules/edit/new', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('modules/form', { 
			title: app.i18n.t(req,'create new module'),
			elementName: 'module',
			element: ''
		});	
	});
	//POST: module form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/modules/edit', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//prima verifico se il dominio non è già stato usato
		app.jsl.module.findOne(
			{ 'domain': req.body.domain },
			function(err, module) {
				if ( module ) 
				{
					//domain già usato
					app.jsl.errorPage(res, err, "already exists module with domain: "+req.body.domain);
				}
				else
				{
					//domain libero
					//creo nuovo module
					var my_module = new app.jsl.module();
					//popolo il mio module con quanto mi arriva dal form
					app.jsl.populateModel(my_module, req.body);
					//assegno l'author (non gestito dal form ma impostato automaticamente)
					my_module.author = req.session.user_id;
					//inizializzo la data di creazione (che non è gestita dal form)
					my_module.created = new Date();
					//salvo il nuovo module
					my_module.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio module nuovo
							//e rimando nel form
							res.redirect('/modules/edit/'+my_module.id+'/success');
						}
						else
						{
							app.jsl.errorPage(res, err, "POST: module form: saving module");
						}
					});
				}
			}
		);	
	});	
	
	//GET: module form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/modules/edit/:id/:msg?', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnModuleId, function(req, res, next){
		app.jsl.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio module dal db, e assegno il result al tpl
		app.jsl.module.findOne(
			{ '_id': req.params.id },
			function(err, module) {
				if (!err)
				{
					res.render('modules/form', { 
						title: app.i18n.t(req,'modify module'),
						elementName: 'module',
						element: module,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: module form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: module form (modify)
	app.post('/modules/edit/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnModuleId, function(req, res, next){
		app.jsl.routeInit(req);
		//prima trovo il mio module da modificare nel db
		app.jsl.module.findOne(
			{ '_id': req.params.id },
			function(err, module) {
				if (!err)
				{
					//ho trovato lo module da modificare
					//prima di popolare lo module controllo che, se l'module sta cambiando domain, non scelga un'domain già usata
					//(in patica cerco uno module che abbia la mia stessa domain, ma un id differente: se lo trovo, vuol dire che la domain è già stata usata)
					app.jsl.module.findOne(
						{ 'domain': req.body.domain, '_id': { $ne : req.body.id } },
						function(err, moduleSameDomain) {
							if ( moduleSameDomain ) 
							{
								//domain già usata
								app.jsl.errorPage(res, err, "already exists module with domain: "+req.body.domain);
							}
							else
							{
								//la nuova domain è valida, posso procedere
								//popolo il mio module con quanto mi arriva dal form
								app.jsl.populateModel(module, req.body);
								//salvo lo module modificato e rimando nel form
								module.save(function(err) {
									res.redirect('/modules/edit/'+module.id+'/success');
								});
							}
						}
					);
				}
				else
				{
					app.jsl.errorPage(res, err, "POST: module form (modify): module not found on db");
				}
			}
		);
	});
	
	//GET: module delete
	app.get('/modules/delete/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModifyOnModuleId, function(req, res, next){
		app.jsl.routeInit(req);
		//cancello l'module
		app.jsl.module.remove(
			{ '_id': req.params.id },
			function(err, module) {
				if ( err ) app.jsl.errorPage(res, err, 'GET: module delete: failed query on db');
			}
		);
		//QUI!!!: oltre a module, vanno cancellati anche tutti i suoi elementi dipendenti
		//faccio un redirect sulla lista
		res.redirect('/modules');
	});
		
	*/
}
exports.defineRoutes = defineRoutes;


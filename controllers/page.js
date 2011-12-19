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
page
*/

function defineRoutes(app) {

	//GET: page list
	app.get('/pages/:page?', app.jsl.readStrucPermDefault, app.jsl.paginationInit, function(req, res, next){
		app.jsl.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo le page dal db, e assegno il result al tpl
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
			//alle conditions devo appendere anche la condizione sul filtraggio per sito, se definita
			if ( req.session.filterBySite )
			{
				//console.log('dovrei filtrare per sito: '+req.session.filterBySite+' con queste conditions:');
				conditions.site = req.session.filterBySite;
				//console.log(conditions);
			}
			
			
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.page.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.page.find(
							conditions,
							[], 
							{ 
								sort: ['route', 'ascending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, pages) {
								//ho trovato le mie pagine
								//devo popolare anche il combo con i siti
								app.jsl.siteController.getSites(req,res,function(sites) {
									//ho trovato anche i sites per popolare il combo
									//posso finalmente procedere a visualizzare la lista delle pagine
									res.render('pages/list', { 
										elementName: 'page',
										elements: pages,
										pagination: app.jsl.paginationDo(req, total, '/pages/'),
										combo_sites: sites
									});	
								});								
							}
						);	
					}
					else
					{
						app.jsl.errorPage(res, err, "GET: page list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: page detail 
	app.get('/pages/:id', app.jsl.readStrucPermDefault, function(req, res, next){
		app.jsl.routeInit(req);
		//leggo il mio page dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.page
			.findOne( conditions )
			.populate('author')
			.populate('site')
			.run(function(err, page) {
				//console.log(page);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un page col mio id e status: share,
					//in questo caso ritorna uno page null, quindi devo controllare se esiste lo page, altrimenti rimando in home
					if ( page )
					{
						res.render('pages/detail', { 
							elementName: 'page',
							element: page
						});	
					}
					else
					{
						//non esiste un page share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: page detail: query error");
				}
			});	
	});
	
	//GET: page form (new)
	app.get('/pages/edit/new', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		//(devo ovviamente popolare solo il combo con i miei sites)
		app.jsl.siteController.getSites(req,res,function(sites) {
			//ho trovato anche i sites per popolare il combo
			
			//se il mio user sta filtrando su un sito (session.filterBySite è definito) allora preimposto il site della nuova page
			var element = {};
			if ( req.session.filterBySite != '' && req.session.filterBySite != undefined )
			{
				element.site = req.session.filterBySite;
			}
			
			//posso finalmente procedere a visualizzare il form
			res.render('pages/form', { 
				title: app.i18n.t(req,'create new page'),
				elementName: 'page',
				element: element,
				combo_sites: sites
				
			});	
		});				
	});
	//POST: page form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/pages/edit', app.jsl.readStrucPermDefault, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//prima verifico se la route non è già stata usata (cioè se esiste una pagina con questa route e per questo site)
		app.jsl.page.findOne(
			{ 'route': req.body.route, 'site': req.body.site },
			function(err, page) {
				if ( page ) 
				{
					//route già usato
					app.jsl.errorPage(res, err, "already exists page with route: "+req.body.route);
				}
				else
				{
					//route libero
					//creo nuovo page
					var my_page = new app.jsl.page();
					//popolo il mio page con quanto mi arriva dal form
					app.jsl.populateModel(my_page, req.body);
					//assegno l'author (non gestito dal form ma impostato automaticamente)
					my_page.author = req.session.user_id;
					//inizializzo la data di creazione (che non è gestita dal form)
					my_page.created = new Date();
					//salvo il nuovo page
					my_page.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio page nuovo
							//e rimando nel form
							res.redirect('/pages/edit/'+my_page.id+'/success');
						}
						else
						{
							app.jsl.errorPage(res, err, "POST: page form: saving page");
						}
					});
				}
			}
		);	
	});	
	
	//GET: page form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/pages/edit/:id/:msg?', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio page dal db, e assegno il result al tpl
		app.jsl.page.findOne(
			{ '_id': req.params.id },
			function(err, page) {
				if (!err)
				{
					//devo ovviamente popolare anche il combo con i miei sites
					app.jsl.siteController.getSites(req,res,function(sites) {
						//ho trovato anche i sites per popolare il combo
						//posso finalmente procedere a visualizzare il form popolato
						res.render('pages/form', { 
							title: app.i18n.t(req,'modify page'),
							elementName: 'page',
							element: page,
							msg: req.params.msg,
							combo_sites: sites
						});	
					});						
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: page form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: page form (modify)
	app.post('/pages/edit/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//prima trovo il mio page da modificare nel db
		app.jsl.page.findOne(
			{ '_id': req.params.id },
			function(err, page) {
				if (!err)
				{
					//ho trovato lo page da modificare
					//prima di popolare lo page controllo che, se l'page sta cambiando route, non scelga una route già usata
					//(in patica cerco uno page che abbia la mia stessa route, ma un id differente: se lo trovo, vuol dire che la route è già stata usata)
					app.jsl.page.findOne(
						{ 'route': req.body.route, '_id': { $ne : req.body.id } },
						function(err, pageSameRoute) {
							if ( pageSameRoute ) 
							{
								//route già usata
								app.jsl.errorPage(res, err, "already exists page with route: "+req.body.route);
							}
							else
							{
								//la nuova route è valida, posso procedere
								//popolo il mio page con quanto mi arriva dal form
								app.jsl.populateModel(page, req.body);
								//salvo lo page modificato e rimando nel form
								page.save(function(err) {
									res.redirect('/pages/edit/'+page.id+'/success');
								});
							}
						}
					);
				}
				else
				{
					app.jsl.errorPage(res, err, "POST: page form (modify): page not found on db");
				}
			}
		);
	});
	
	//GET: page delete
	app.get('/pages/delete/:id', app.jsl.readStrucPermDefault, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//cancello l'page
		app.jsl.page.remove(
			{ '_id': req.params.id },
			function(err, page) {
				if ( err ) app.jsl.errorPage(res, err, 'GET: page delete: failed query on db');
			}
		);
		//QUI!!!: oltre a page, vanno cancellati anche tutti i suoi elementi dipendenti
		//faccio un redirect sulla lista
		res.redirect('/pages');
	});
		
	
}

exports.defineRoutes = defineRoutes; 

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
site
*/

function defineRoutes(app) {

	//GET: site list
	app.get('/sites/:page?', app.jsl.readStrucPermOn_sites, app.jsl.paginationInit, function(req, res, next){
		app.jsl.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli site dal db, e assegno il result al tpl
			//se sono superadmin vedo anche i non share
			var conditions = ( req.session.user_id == 'superadmin' ) 
			? 
			{} 
			: 
			{ $or: [
					{ 'status': 'share' }, 
					{'author': req.session.user_id }
			]};
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.site.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.site.find(
							conditions,
							[], 
							{ 
								sort: ['title', 'descending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, sites) {
								res.render('sites/list', { 
									sites: sites,
									pagination: app.jsl.paginationDo(req, total, '/sites/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.errorPage(res, err, "GET: site list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: site detail 
	app.get('/sites/:id', app.jsl.readStrucPermOn_sites, function(req, res, next){
		app.jsl.routeInit(req);
		//leggo il mio site dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.site
			.findOne( conditions )
			.populate('author')
			.run(function(err, site) {
				//console.log(site);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un site col mio id e status: share,
					//in questo caso ritorna uno site null, quindi devo controllare se esiste lo site, altrimenti rimando in home
					if ( site )
					{
						res.render('sites/detail', { 
							site: site
						});	
					}
					else
					{
						//non esiste un site share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: site detail: query error");
				}
			});	
	});
	
	//GET: site form (new)
	app.get('/sites/edit/new', app.jsl.readStrucPermOn_sites, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('sites/form', { 
			title: app.i18n.t(req,'create new site'),
			site: ""
		});	
	});
	//POST: site form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/sites/edit', app.jsl.readStrucPermOn_sites, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//prima verifico se il dominio non è già stato usato
		app.jsl.site.findOne(
			{ 'domain': req.body.domain },
			function(err, site) {
				if ( site ) 
				{
					//domain già usato
					app.jsl.errorPage(res, err, "already exists site with domain: "+req.body.domain);
				}
				else
				{
					//domain libero
					//creo nuovo site
					var my_site = new app.jsl.site();
					//popolo il mio site con quanto mi arriva dal form
					app.jsl.populateModel(my_site, req.body);
					//assegno l'author (non gestito dal form ma impostato automaticamente)
					my_site.author = req.session.user_id;
					//inizializzo la data di creazione (che non è gestita dal form)
					my_site.created = new Date();
					//salvo il nuovo site
					my_site.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio site nuovo
							//e rimando nel form
							res.redirect('/sites/edit/'+my_site.id+'/success');
						}
						else
						{
							app.jsl.errorPage(res, err, "POST: site form: saving site");
						}
					});
				}
			}
		);	
	});	
	
	//GET: site form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/sites/edit/:id/:msg?', app.jsl.readStrucPermOn_sites, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio site dal db, e assegno il result al tpl
		app.jsl.site.findOne(
			{ '_id': req.params.id },
			function(err, site) {
				if (!err)
				{
					res.render('sites/form', { 
						title: app.i18n.t(req,'modify site'),
						site: site,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: site form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: site form (modify)
	app.post('/sites/edit/:id', app.jsl.readStrucPermOn_sites, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//prima trovo il mio site da modificare nel db
		app.jsl.site.findOne(
			{ '_id': req.params.id },
			function(err, site) {
				if (!err)
				{
					//ho trovato lo site da modificare
					//prima di popolare lo site controllo che, se l'site sta cambiando domain, non scelga un'domain già usata
					//(in patica cerco uno site che abbia la mia stessa domain, ma un id differente: se lo trovo, vuol dire che la domain è già stata usata)
					app.jsl.site.findOne(
						{ 'domain': req.body.domain, '_id': { $ne : req.body.id } },
						function(err, siteSameMail) {
							if ( siteSameMail ) 
							{
								//domain già usata
								app.jsl.errorPage(res, err, "already exists site with domain: "+req.body.domain);
							}
							else
							{
								//la nuova domain è valida, posso procedere
								//popolo il mio site con quanto mi arriva dal form
								app.jsl.populateModel(site, req.body);
								//salvo lo site modificato e rimando nel form
								site.save(function(err) {
									res.redirect('/sites/edit/'+site.id+'/success');
								});
							}
						}
					);
				}
				else
				{
					app.jsl.errorPage(res, err, "POST: site form (modify): site not found on db");
				}
			}
		);
	});
	
	//GET: site delete
	app.get('/sites/delete/:id', app.jsl.readStrucPermOn_sites, app.jsl.needStrucPermModify, function(req, res, next){
		app.jsl.routeInit(req);
		//cancello l'site
		app.jsl.site.remove(
			{ '_id': req.params.id },
			function(err, site) {
				if ( err ) app.jsl.errorPage(res, err, 'GET: site delete: failed query on db');
			}
		);
		//QUI!!!: oltre all'site, vanno cancellati anche tutti i suoi contenuti. aggiornare la lista dei delete man mano che si creano nuovi elementi della struttura o dei contenuti
		//faccio un redirect sulla lista
		res.redirect('/sites');
	});
		
	
}

exports.defineRoutes = defineRoutes; 

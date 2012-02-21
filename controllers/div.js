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
div
*/

function defineRoutes(app) {




	//GET: div list
	app.get('/divs/:page?', app.jsl.perm.readStrucPermDefault, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli div dal db, e assegno il result al tpl
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
			app.jsl.div.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.div.find(
							conditions,
							[], 
							{ 
								skip: req.session.skip, 
								limit: req.session.limit 
							}
						)
						.sort('created', -1)
						.run(function(err, divs) {
							res.render('divs/list', { 
								elementName: 'div',
								elements: divs,
								pagination: app.jsl.pag.paginationDo(req, total, '/divs/')
							});	
						});	
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "GET: div list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});

	//GET: div detail 
	app.get('/divs/:id', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//leggo il mio div dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.div
			.findOne( conditions )
			.populate('author')
			.populate('children.div')
			.run(function(err, div) {
				//console.log(div);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un div col mio id e status: share,
					//in questo caso ritorna uno div null, quindi devo controllare se esiste lo div, altrimenti rimando in home
					if ( div )
					{
						res.render('divs/detail', { 
							elementName: 'div',
							element: div
						});	
					}
					else
					{
						//non esiste un div share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: div detail: query error");
				}
			});	
	});
	
	//GET: div form (new)
	app.get('/divs/edit/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		//(devo ovviamente popolare solo il combo con i miei models)
		app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {		
			res.render('divs/form', { 
				title: app.i18n.t(req,'create new div'),
				elementName: 'div',
				element: '',
				jslModels: jslModels
			});
		});
	});
	//POST: div form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/divs/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//creo nuovo div
		var my_div = new app.jsl.div();
		//popolo il mio div con quanto mi arriva dal form
		app.jsl.utils.populateModel(my_div, req.body);
		//assegno l'author (non gestito dal form ma impostato automaticamente)
		my_div.author = req.session.user_id;
		//inizializzo la data di creazione (che non è gestita dal form)
		my_div.created = new Date();
		//salvo il nuovo div
		my_div.save(function (err) {
			if (!err) 
			{
				//ho creato con successo il mio div nuovo
				//e rimando nel form
				res.redirect('/divs/edit/'+my_div.id+'/success');
			}
			else
			{
				app.jsl.utils.errorPage(res, err, "POST: div form: saving div");
			}
		});
	});	
	
	//GET: div form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/divs/edit/:id/:msg?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnDivId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio div dal db, e assegno il result al tpl
		app.jsl.div.findOne(
			{ '_id': req.params.id },
			function(err, div) {
				if (!err)
				{
					//(devo ovviamente popolare solo il combo con i miei models)
					app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {		
						res.render('divs/form', { 
							title: app.i18n.t(req,'modify div'),
							elementName: 'div',
							element: div,
							jslModels: jslModels,
							msg: req.params.msg
						});	
					});	
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: div form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: div form (modify)
	app.post('/divs/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnDivId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima trovo il mio div da modificare nel db
		app.jsl.div.findOne(
			{ '_id': req.params.id },
			function(err, div) {
				if (!err)
				{
					//ho trovato lo div da modificare
					//popolo il mio div con quanto mi arriva dal form
					app.jsl.utils.populateModel(div, req.body);
					//console.log('sto per salvare sto div:');
					//console.log(div);
					//salvo lo div modificato e rimando nel form
					div.save(function(err) {
						res.redirect('/divs/edit/'+div.id+'/success');
					});
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: div form (modify): div not found on db");
				}
			}
		);
	});
	
	//GET: div delete
	app.get('/divs/delete/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnDivId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//QUI!!!: oltre a div, vanno cancellati anche tutti i suoi elementi dipendenti
		//sia per page che per div
		
		//prima cerco le pagine che hanno il mio div tra i propri divs
		//console.log("cerco parenti pagina");
		app.jsl.page
			.find( {'divs.div': req.params.id}, [], {} )
			.run(function(err, pages) {
				if (!err) {
					//console.log("trovati "+pages.length+" parenti pagina");
					for (var i = 0; i < pages.length; i++) {
						var page = pages[i];
						//console.log("trovata relazione con pagina:"+pages[i].route);
						//ciclo sui figli della mia pagina, per trovare me stesso ed eliminarmi
						for (var j = 0; j < page.divs.length; j++) {
							var div = page.divs[j];
							//console.log("div figlio della mia pagina: ");
							//console.log(div);
							if ( div.div == req.params.id ) {
								//console.log("trovato il mio div, mo lo elimino!");
								//console.log("prima di splice:");
								//console.log(page.divs);
								//trovato me stesso, mi tolgo dall'array, salvo ed esco dal ciclo
								page.divs.splice(j,1);
								//console.log("dopo di splice:");
								//console.log(page.divs);
								//console.log("salvo!");
								page.save(function (err) {
									if (!err) 
									{
										//ho eliminato la relazione con la mia pagina
										//console.log("eliminata relazione con pagina!");
									}
									else
									{
										res.json({ 'error': 'GET: div delete: failed saving page relations'});
									}
								});
								break;
							}
						}
					}
				} else {
					app.jsl.utils.errorPage(res, err, 'GET: div delete: failed finding page relations');
				}

			});
			
		//poi cerco i div che hanno il mio div tra i propri children
		//console.log("cerco parenti pagina");
		app.jsl.div
			.find( {'children.div': req.params.id}, [], {} )
			.run(function(err, divs) {
				if (!err) {
					//console.log("trovati "+divs.length+" parenti pagina");
					for (var i = 0; i < divs.length; i++) {
						var div = divs[i];
						//console.log("trovata relazione con parent:"+divs[i].id);
						//ciclo sui figli della mia pagina, per trovare me stesso ed eliminarmi
						for (var j = 0; j < div.children.length; j++) {
							var my_div = div.children[j];
							//console.log("div figlio del mio parent: ");
							//console.log(my_div);
							if ( my_div.div == req.params.id ) {
								//console.log("trovato il mio div, mo lo elimino!");
								//console.log("prima di splice:");
								//console.log(div.children);
								//trovato me stesso, mi tolgo dall'array, salvo ed esco dal ciclo
								div.children.splice(j,1);
								//console.log("dopo di splice:");
								//console.log(div.children);
								//console.log("salvo!");
								div.save(function (err) {
									if (!err) 
									{
										//ho eliminato la relazione con la mia pagina
										//console.log("eliminata relazione con pagina!");
									}
									else
									{
										res.json({ 'error': 'GET: div delete: failed saving div relations'});
									}
								});
								break;
							}
						}
					}
				} else {
					app.jsl.utils.errorPage(res, err, 'GET: div delete: failed finding div relations');
				}

			});
			

		//alla fine cancello il div
		app.jsl.div.remove(
			{ '_id': req.params.id },
			function(err, div) {
				if ( err ) app.jsl.utils.errorPage(res, err, 'GET: div delete: failed query on db');
			}
		);
		
		//faccio un redirect sulla lista
		res.redirect('/divs');
	});



























	/* JSON ROUTES */



	

	//POST: json div list (case no page id passed)
	app.post('/json/divs/divChildren//:param?', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		res.json( [] );
	});
	//POST: json div list 
	app.post('/json/divs/divChildren/:page/:param?', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//console.log(req.params);
		//console.log(req.body);
		
		//devo distinguere due casi: se in POST mi hanno passato un oggetto, quello ha la precedenza sui params passati in GET
		//nello specifico l'oggetto in POST mi viene passato quando voglio i children di un altro div,
		//mentre i params in GET mi servono per avere i divs di una pagina
		if ( typeof req.body === 'object' && !app.jsl.utils.is_empty(req.body) ) {
			//console.log('ho l oggetto in post, trovo i figli di un div');
			//ho l'oggetto in post, trovo i figli di un div
			var conditions = ( req.session.user_id == 'superadmin' ) 
			? 
			{} 
			: 
			{ $or: [
					{ 'status': 'public' }, 
					{ 'status': 'share' }, 
					{'author': req.session.user_id }
			]};
			//se è stato specificato un parent, filtro su di lui
			if ( req.body.parent ) conditions._id = req.body.parent;
			//eseguo la query
			app.jsl.div
				.findOne( conditions )
				.populate('children.div')
				.run(function(err, div) {
					if ( !err ) {
						//se il mio div non ha figli, ritorno un json vuoto
						if ( !div || !div.children || div.children.length == 0 ) {
							res.json();
						} else {
							//il mio div ha figli.
							//se il chiamante è jstree, prima di ritornare l'array di divs, devo normalizzarli, perchè jstree li vuole conditi a modo suo
							if ( req.params.param && req.params.param == 'jstree' )
							{
								//prima di normalizzarli, li ordino per order
								div.children.sort(sortByOrd);
								//console.log("div.children: appena leggo dal db:");
								//console.log(div.children);
								//poi normalizzo
								var normDivs = [];
								var len = div.children.length;
								for (var i = 0; i < len; i++) {
									//console.log(div.children[i]);
									var obj = { 
										'data' : ( div.children[i].div.dom_id != '' ) ? div.children[i].div.dom_id+' ('+div.children[i].div.type+')' : div.children[i].div.class+' ('+div.children[i].div.type+')',
										'attr' : { 'rel' : div.children[i].div.type, 'href' : '/divs/edit/'+div.children[i].div._id },
										'metadata' : {
											'type' : div.children[i].div.type,
											'dom_id' : div.children[i].div.dom_id,
											'class' : div.children[i].div.class,
											'is_table' : (div.children[i].div.is_table) ? 'sure_this_is_true' : 'sure_this_is_false',
											'inline_style' : (div.children[i].div.inline_style) ? 'sure_this_is_true' : 'sure_this_is_false',
											'view' : div.children[i].div.view,
											'id' : div.children[i].div._id,
											'children' : div.children[i].div.children,
											'status' : div.children[i].div.status
										}
									};
									if ( div.children[i].div.children.length > 0 ) obj.state = 'closed';
									normDivs.push(obj);
								}	
								res.json( normDivs );
							}
							else {
								res.json( div.children );
							}
						}
					}
					else {
						res.json({ 'error': 'GET: json div children: query error'});
					}
				});	
		}
		else {
			//ho solo i paramas in get, trovo i divs di una pagina
			//leggo i div dal db
			//console.log('ho solo i paramas in get, trovo i divs di una pagina');
			var conditions = ( req.session.user_id == 'superadmin' ) 
			? 
			{} 
			: 
			{ $or: [
					{ 'status': 'public' }, 
					{ 'status': 'share' }, 
					{'author': req.session.user_id }
			]};
			//poi aggiungo la condizione sulla pagina
			conditions._id = req.params.page;
			//eseguo la query
			app.jsl.page
				.findOne( conditions )
				.populate('divs.div')
				.run(function(err, page) {
					if ( !err ) {
						if ( page && typeof page.divs === 'object' && page.divs.length > 0 )
						{
							//console.log('pagina trovata');
							//se il chiamante è jstree, prima di ritornare l'array di divs, devo normalizzarli, perchè jstree li vuole conditi a modo suo
							if ( req.params.param && req.params.param == 'jstree' )
							{
								//prima di normalizzarli, li ordino per order
								page.divs.sort(sortByOrd);							
								//console.log("page.divs: appena leggo dal db dopo sort:");
								//console.log(page.divs);
								//console.log("page.divs: appena leggo dal db:");
								//console.log(page.divs);
								//poi normalizzo
								var normDivs = [];
								var len = page.divs.length;
								for (var i = 0; i < len; i++) {
									//console.log(page.divs[i]);
									var obj = { 
										'data' : ( page.divs[i].div.dom_id != '' ) ? page.divs[i].div.dom_id+' ('+page.divs[i].div.type+')' : page.divs[i].div.class+' ('+page.divs[i].div.type+')',
										'attr' : { 'rel' : page.divs[i].div.type, 'href' : '/divs/edit/'+page.divs[i].div._id },
										'metadata' : {
											'type' : page.divs[i].div.type,
											'class' : page.divs[i].div.class,
											'dom_id' : page.divs[i].div.dom_id,
											'is_table' : (page.divs[i].div.is_table) ? 'sure_this_is_true' : 'sure_this_is_false',
											'inline_style' : (page.divs[i].div.inline_style) ? 'sure_this_is_true' : 'sure_this_is_false',
											'view' : page.divs[i].div.view,
											'status' : page.divs[i].div.status,
											'id' : page.divs[i].div._id,
											'children' : page.divs[i].div.children
										}
									};
									if ( typeof page.divs[i].div.children === 'object' && page.divs[i].div.children.length > 0 ) obj.state = 'closed';
									//console.log(obj);
									normDivs.push(obj);
								}	
								res.json( normDivs );
							}
							else {
								res.json( page.divs );
							}
						}
						else {
							//non esiste la pagina di cui si richiedono i div oppure non ha div
							//ritorno un json vuoto
							//console.log('pagina non trovata o priva di divs');
							res.json( [ {} ] );
						}
					}
					else {
						res.json({ 'error': 'GET: json page divs: query error'});
					}
				});	
			
		}
		
	});
	
	
	
	//POST: json div form (new)
	//creo un nuovo div dall'admin
	app.post('/json/divs/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//console.log('div: POST divs new'); 
		//console.log(req.body);
		//creo nuovo div
		var my_div = new app.jsl.div();
		//popolo il mio div
		//console.log("mi arriva questo div:");
		//console.log(req.body.div);
		app.jsl.utils.populateModel(my_div, req.body.div);
		//console.log("ho popolato il model così:");
		//console.log(my_div);
		//console.log('typeof req.body.div.is_table = ' + typeof req.body.div.is_table );
		//console.log('typeof my_div.is_table = ' + typeof my_div.is_table );
		//assegno l'author (non gestito dal form ma impostato automaticamente)
		my_div.author = req.session.user_id;
		//inizializzo la data di creazione (che non è gestita dal form)
		my_div.created = new Date();
		//salvo il nuovo div
		my_div.save(function (err) {
			if (!err) 
			{
				//ho creato con successo il mio div nuovo
				//console.log('div creato, lo ritorno: ');
				//console.log(my_div);
				res.json(my_div);
			}
			else
			{
				console.log('POST: json div form new: error saving div');
				res.json({ 'error': 'POST: json div form new: error saving div'});
			}
		});
	});	
	
	//POST: json page add div
	//devo appendere un div già creato ad un div parent
	app.post('/json/divs/appendDiv/:parent/:div/:order', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		appendDiv(req, req.params.parent, req.params.div, req.params.order, function(){ res.json(); });
	});	


	//POST: json move div
	//devo muovere un div tra 2 padri (possono essere lo stesso) e secondo un order
	app.post('/json/divs/moveDiv/:div/:order/:oldParent/:newParent/:page', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModify, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//console.log(req.params);
		//trovo tutti i div (miei vecchi fratelli) figli del vecchio parent
		findParentChildren( req.params.oldParent, function (children) {
			var oldParentChildren = children;
			//CORREZIONE PARAMETRO ORD PASSATO DA JSTREE
			//controllo se mi sto muovendo all'interno dello stesso parent (altrimenti )
			if (req.params.oldParent == req.params.newParent) { //dovrebbe funzionare anche se mi sto muovendo nella root e non in un container, in cui entrambi gli id sono undefined
				//stesso padre
				//cerco l'oldOrd del mio div prima che venisse mosso (il db riporta ancora il vecchio order)
				var oldOrd = 0;
				//cerco me stesso ciclando sui figli di mio padre (vecchio o nuovo è uguale)
				//console.log('cerco il mio vecchio ord tra figli n.'+oldParentChildren.length);
				for (var i = 0; i < oldParentChildren.length; i++) {
					//console.log('figlio n.'+i+' ha ord:'+oldParentChildren[i].order+' e id: '+oldParentChildren[i].div);
					//console.log(oldParentChildren[i].div+'=='+req.params.div);
					if ( oldParentChildren[i].div == req.params.div ) {
						//da me stesso trovo l'oldOrd
						oldOrd = oldParentChildren[i].order;
						//console.log('trovato oldOrd: '+oldOrd);
						break;
					}
				}
				//se oldOrd < order vuol dire che mi sto spostando in avanti nell'array, e l'order riportato da jstree
				//va diminuito di 1
				//console.log("oldOrd "+oldOrd);
				//console.log("corretto order da "+req.params.order);
				if ( oldOrd < req.params.order ) req.params.order--;
				//console.log("order definitivo: "+req.params.order);
			}
			
			//ora devo scollegare il div dal vecchio parent
			unlinkFromParent( req.params.oldParent, function () {
				//infine lo appendo al nuovo parent
				if ( req.params.newParent == 'undefined' ) {
					//sono in una pagina
					//appendo alla nuova pagina parent (redirect su altra route)
					app.jsl.pageController.appendDiv(req, req.params.page, req.params.div, req.params.order, function () {
						//finito di spostare il mio div!
						res.json();
					});
				} else {
					//sono in un div container
					//appendo al nuovo div parent (redirect su altra route)
					app.jsl.divController.appendDiv(req, req.params.newParent, req.params.div, req.params.order, function () {
						//finito di spostare il mio div!
						res.json();
					});
				}
				
			});
			
			
		});
		
		function unlinkFromParent( parent, next ) {
			if ( req.params.oldParent == 'undefined' ) {
				//il vecchio parent è una pagina
				//scollego il div dalla pagina
				app.jsl.pageController.unlinkDiv(req, req.params.page, req.params.div, next);
			} else {
				//il vecchio parent è un div container
				//scollego il div dal div container
				app.jsl.divController.unlinkDiv(req, req.params.oldParent, req.params.div, next);
			}
		}
		
		function findParentChildren( parent, next ) {
			if ( parent == 'undefined' ) {
				//il newParent è una pagina
				var conditions = ( req.session.user_id == 'superadmin' ) 
				? 
				{ '_id': req.params.page } 
				: 
				{ '_id': req.params.page, 'author': req.session.user_id };
				app.jsl.page.findOne( conditions, [], {} )
				.run(function(err, page) {
					if ( !err ) {
						if ( page ) {
							//ho trovato la mia pagina
							//ritorno i suoi divs
							//console.log(page.divs);
							next(page.divs);
						} else {
							console.log('/json/divs/moveDiv: page not found');
							res.json();
						}
					} else {
						console.log('/json/divs/moveDiv: error in page query');
						res.json();
					}
				});	
			} else {
				//il newParent è un div container
				var conditions = ( req.session.user_id == 'superadmin' ) 
				? 
				{ '_id': parent } 
				: 
				{ '_id': parent, 'author': req.session.user_id };
				app.jsl.div.findOne( conditions, [], {} )
				.run(function(err, div) {
					if ( !err ) {
						if ( div ) {
							//ho trovato div
							//ritorno i suoi divs
							//console.log(div.children);
							next(div.children);
						} else {
							console.log('/json/divs/moveDiv: div not found');
							res.json();
						}
					} else {
						console.log('/json/divs/moveDiv: error in div query');
						res.json();
					}
				});	
			}
		}

	});	


	//POST: json unlink div
	//scollega un link dal vecchio parent
	app.post('/json/divs/unlinkDiv/:id/:oldParent/:page', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnDivId, function(req, res, next){
		
		if ( req.params.oldParent == 'undefined' ) {
			//il vecchio parent è una pagina
			//scollego il div dalla pagina
			app.jsl.pageController.unlinkDiv(req, req.params.page, req.params.id, function() { res.json(); });
		} else {
			//il vecchio parent è un div container
			//scollego il div dal div container
			app.jsl.divController.unlinkDiv(req, req.params.oldParent, req.params.id, function() { res.json(); });
		}
		

	});	


	
}
exports.defineRoutes = defineRoutes;
 
function addDivOrdered( newDiv, divs ) {
	//console.log('### addDivOrdered divs prima:');
	//console.log(divs);
	//ordino
	divs.sort(sortByOrd);
	//sostituisco i valori di order secondo il nuovo ordinamento
	//e tenendo newDiv.order libero
	for ( var i = 0; i < divs.length; i++ ) {
		if ( i >= newDiv.order ) {
			divs[i].order = 1 + i;
		} else {
			divs[i].order = i;
		}
		//divs[i].markModified('order');
	}
	//appendo il nuovo div
	divs.push(newDiv);
	//riordino l'array (ora ho tutti gli elementi, con gli order giusti)
	divs.sort(sortByOrd);
	
	//clono l'array
	
	//console.log('### addDivOrdered divs dopo:');
	//console.log(divs);
	//restituisco
	//return divs;
	return divs.slice(0); //questo dovrebbe tornare un clone dell'array
}
exports.addDivOrdered = addDivOrdered;

function appendDiv(req, parent_id, div_id, order, next) {
	//trovo il div container cui appendere il div
	//il div deve essere la mia, per sicurezza la query non viene eseguita se non è una mia div
	var conditions = ( req.session.user_id == 'superadmin' ) 
	? 
	{ '_id': parent_id } 
	: 
	{ '_id': parent_id, 'author': req.session.user_id };
	req.app.jsl.div.findOne(
		conditions,
		function(err, div) {
			if (!err)
			{
				//ho trovato lo div da modificare
				//appendo il nuovo div al di da modificare, nella posizione corretta
				//console.log('i miei fratelli prima di me: ');
				//console.log(div.children);
				div.children = addDivOrdered(
					{
						father : parent_id,
						div : div_id,
						order : order
					},
					div.children
				);
				//console.log('i miei fratelli dopo di me: ');
				//console.log(div.children);
				//salvo il div modificato
				div.markModified('children');
				//div.commit('children');
				div.save(function(err) {
					if (!err) 
					{
						//ho salvato con successo il mio div nuovo
						next();
					}
					else
					{
						console.log('POST: json div add div: error saving div');
						//res.json({ 'error': 'POST: json div add div: error saving div'});
					}
				});
			}
			else
			{
				console.log('POST: json div add div: div not found on db');
				//res.json({ 'error': 'POST: json div add div: div not found on db'});
			}
		}
	);
	
	
	
	
}
exports.appendDiv = appendDiv; 


function unlinkDiv(req, parent, div_id, next) {
	var conditions = ( req.session.user_id == 'superadmin' ) 
	? 
	{ '_id': parent } 
	: 
	{ '_id': parent, 'author': req.session.user_id };
	req.app.jsl.div.findOne( conditions, [], {} )
	.run(function(err, div) {
		if ( !err ) {
			if ( div ) {
				//ho trovato il mio div
				//tolgo me stesso dai suoi children
				for (var i = 0; i < div.children.length; i++) {
					if ( div.children[i].div == div_id ) {
						//trovato me stesso.
						//mi elimino
						//console.log('io e i miei fratelli:');
						//console.log(div.children);
						div.children.splice(i,1);
						//console.log('solo i miei fratelli:');
						//console.log(div.children);
						
						//salvo la pagina con i figli modificati
						div.save(function(err) {
							if (!err) 
							{
								//ho salvato con successo
								next();
							}
							else
							{
								res.json({ 'error': 'unlinkDiv(): error saving div'});
							}
						});
						break;
					}
				}				
			} else {
				console.log('unlinkDiv(): div not found');
			}
		} else {
			console.log('unlinkDiv(): error in div query');
		}
	});	
}
exports.unlinkDiv = unlinkDiv; 

function sortByOrd(a,b)
{
	return a.order - b.order;
}	

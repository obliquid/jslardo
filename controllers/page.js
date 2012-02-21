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
	app.get('/pages/:page?', app.jsl.perm.readStrucPermDefault, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			getRecords(app,req,res,{},function(pages,total){
				//devo popolare anche il combo con i siti
				app.jsl.siteController.getSites(req,res,function(sites) {
					//ho trovato anche i sites per popolare il combo
					//posso finalmente procedere a visualizzare la lista delle pagine
					res.render('pages/list', { 
						elementName: 'page',
						elements: pages,
						pagination: app.jsl.pag.paginationDo(req, total, '/pages/'),
						combo_sites: sites
					});	
				});
				
			});
		}
		else
		{
			next();
		}
	});
	
	//GET: page detail 
	app.get('/pages/:id', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
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
			.populate('children')
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
					app.jsl.utils.errorPage(res, err, "GET: page detail: query error");
				}
			});	
	});
	
	//GET: page form (new)
	app.get('/pages/edit/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		//(devo ovviamente popolare solo il combo con i miei sites e quello con le external pages)
		app.jsl.siteController.getSites(req,res,function(sites) {
			//ho trovato anche i sites per popolare il combo
			//se il mio user sta filtrando su un sito (session.filterBySite è definito) allora preimposto il site della nuova page
			var element = {};
			if ( req.session.filterBySite != '' && req.session.filterBySite != undefined )
			{
				element.site = req.session.filterBySite;
			}
			//devo popolare le pagine disponibili per linkare/copiare divs
			app.jsl.pageController.getPages(req,res,function(pages) {
				//popolato anche il combo pages
				//posso finalmente procedere a visualizzare il form
				res.render('pages/form', { 
					title: app.i18n.t(req,'create new page'),
					elementName: 'page',
					element: element,
					combo_sites: sites,
					combo_pages: pages,
					is_new: 'yes'
					
				});	
			});
		},true); //okkio che passo il parametro onlyMines per avere nel combo solo siti miei, perchè non posso creare una pagina per un sito non mio
	});
	//POST: page form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/pages/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima verifico se la route non è già stata usata (cioè se esiste una pagina con questa route e per questo site)
		app.jsl.page.findOne(
			{ 'route': req.body.route, 'site': req.body.site },
			function(err, page) {
				if ( page ) 
				{
					//route già usato
					app.jsl.utils.errorPage(res, err, app.i18n.t(req, "already exists page with route")+": "+req.body.route);
				}
				else
				{
					//route libero
					//creo nuovo page
					var my_page = new app.jsl.page();
					//popolo il mio page con quanto mi arriva dal form
					app.jsl.utils.populateModel(my_page, req.body);
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
							app.jsl.utils.errorPage(res, err, "POST: page form: saving page");
						}
					});
				}
			}
		);	
	});	
	
	//GET: page form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/pages/edit/:id/:msg?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnPageId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio page dal db, e assegno il result al tpl
		app.jsl.page
			.findOne( { '_id': req.params.id } )
			//.populate('divs')
			.run(function(err, page) {
				if (!err)
				{
					//devo ovviamente popolare anche il combo con i miei sites
					app.jsl.siteController.getSites(req,res,function(sites) {
						//ho trovato anche i sites per popolare il combo
						//devo popolare le pagine disponibili per linkare/copiare divs
						app.jsl.pageController.getPages(req,res,function(pages) {
							//ho anche le pagine per il combo
							//posso finalmente procedere a visualizzare il form popolato
							res.render('pages/form', { 
								title: app.i18n.t(req,'modify page'),
								elementName: 'page',
								element: page,
								msg: req.params.msg,
								combo_sites: sites,
								combo_pages: pages
							});	
						});
					},true); //okkio che passo il parametro onlyMines per avere nel combo solo siti miei, perchè non posso creare una pagina per un sito non mio					
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: page form (modify): failed query on db");
				}	
			});	
	});
	//POST: page form (modify)
	app.post('/pages/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnPageId, function(req, res, next){
		app.jsl.routes.routeInit(req);
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
						{ 'route': req.body.route, 'site': req.body.site, '_id': { $ne : req.body.id } },
						function(err, pageSameRoute) {
							if ( pageSameRoute ) 
							{
								//route già usata
								app.jsl.utils.errorPage(res, err, app.i18n.t(req, "already exists page with route")+": "+req.body.route);
							}
							else
							{
								//la nuova route è valida, posso procedere
								//popolo il mio page con quanto mi arriva dal form
								app.jsl.utils.populateModel(page, req.body);
								//tolgo eventuali slashes dalla route
								page.route = page.route.replace("/", "");
								/*
								while( my_page.route.substr( my_page.route.length -1 ) == '/' ) {
									my_page.route = my_page.route.substr( 0, my_page.route.length -1 );
								}
								*/
								
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
					app.jsl.utils.errorPage(res, err, "POST: page form (modify): page not found on db");
				}
			}
		);
	});
	
	//GET: page delete
	app.get('/pages/delete/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnPageId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//cancello l'page
		app.jsl.page.remove(
			{ '_id': req.params.id },
			function(err, page) {
				if ( err ) app.jsl.utils.errorPage(res, err, 'GET: page delete: failed query on db');
			}
		);
		//QUI!!!: oltre a page, vanno cancellati anche tutti i suoi elementi dipendenti
		//faccio un redirect sulla lista
		res.redirect('/pages');
	});
		
	
	
	
	
	
	
	
	//JSON ROUTES

	//POST: json page add div
	//appendo un div ad una pagina 
	app.post('/json/pages/appendDiv/:page/:div/:ord', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//console.log(req.params);
		appendDiv(req, req.params.page, req.params.div, req.params.ord, function(){ res.json(); });
	});	
	
	
}
exports.defineRoutes = defineRoutes; 





/* query di fetch dei dati usate dalle routes */

/* list */
function getRecords(app,req,res,customConditions,next) {
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
	//applico eventuali customConditions
	for (var field in customConditions) {
		conditions[field] = customConditions[field];
	}	
	//per via della paginazione, ogni query di list va preceduta da una query di count
	app.jsl.page.count(
		conditions,
		function(err, total) {
			if ( !err )
			{
				//procedo col find paginato
				app.jsl.page
					.find(
						conditions,
						[], 
						{ 
							sort: ['route', 'ascending'],
							skip: req.session.skip, 
							limit: req.session.limit 
						}
					)
					.populate('site')
					.run(function(err, pages) {
						//ho trovato le mie pagine
						next(pages,total);
					});	
			}
			else
			{
				app.jsl.utils.errorPage(res, err, "GET: page list: failed query on db");
			}	
		}
	);
}
exports.getRecords = getRecords;





//questo metodo ritorna una lista di tutte le pagina visibili dall'utente corrente
//in base al fatto che sia loggato o meno, e che sia superadmin o meno
function getPages(req,res,closure)
{
	//prima di tutto distinguo se sono loggato o meno
	if ( req.session.loggedIn )
	{
		//poi distinguo se sto filtrando solo sui miei elementi o su tutti (quelli visibili)
		if ( req.session.filterAllOrMine == 'mine' )
		{
			//voglio vedere solo le mie pagine (questa condizione non può avvenire se sono superadmin, quindi non sono sicuramente superadmin)
			//e sono loggato, quindi vedrò solo i miei
			var conditions = { 'author': req.session.user_id };
		}
		else
		{
			//voglio vedere tutte le pagine
			//e sono loggato, quindi devo distinguere se sono superadmin(vedo tutte le pagine) o no (vedo solo le share o le mie)
			var conditions = ( req.session.user_id == 'superadmin' ) 
			? 
			{} 
			: 
			{ $or: [
				{ 'status': 'share' },
				{ 'author': req.session.user_id }
			]};
		}
	}
	else
	{
		//se non sono loggato, vedo solo le share
		var conditions = { 'status': 'share' };
	}
	//aggiungo la conditions sul site se sto filtrando per site
	if ( req.session.filterBySite != '' && req.session.filterBySite != undefined ) {
		conditions.site = req.session.filterBySite;
	}
	
	//poi eseguo la query
	req.app.jsl.page
		.find( conditions, [], { sort: [['site', 'ascending'],['route', 'ascending']] } )
		.populate('site')
		.run(function(err, pages) {
			if ( !err )
			{
				if ( pages )
				{
					//ho trovato delle pagine
					
					closure(pages);
				}
				else
				{
					//non ho trovato nessun site, ritorno niente
					closure();
				}
			}
			else
			{
				req.app.jsl.utils.errorPage(res, err, "page.getPages(): query error");
			}
		});	
}
exports.getPages = getPages;

function appendDiv(req, page_id, div_id, ord, next) {
	//trovo la pagina cui appendere il div
	//la pagina deve essere la mia, per sicurezza la query non viene eseguita se non è una mia pagina
	var conditions = ( req.session.user_id == 'superadmin' ) 
	? 
	{ '_id': page_id } 
	: 
	{ '_id': page_id, 'author': req.session.user_id };
	req.app.jsl.page.findOne(
		conditions,
		function(err, page) {
			if (!err)
			{
				//ho trovato lo page da modificare
				//appendo il nuovo div alla pagina, nella posizione corretta
				//console.log('### i miei fratelli di pagina prima di me: ');
				//console.log(page.divs);
				page.divs = req.app.jsl.divController.addDivOrdered(
					{
						father : page_id,
						div : div_id,
						order : ord
					},
					page.divs
				);
				//console.log('### i miei fratelli di pagina dopo di me: ');
				//console.log(page.divs);
				//salvo la page modificata
				page.markModified('divs'); //forse non serve... sto già clonando
				//page.commit('divs');
				page.save(function(err) {
					if (!err) 
					{
						//ho appeso con successo il mio div nuovo
						next();
					}
					else
					{
						console.log('POST: json page add div: error saving page '+err);
						//res.json({ 'error': 'POST: json page add div: error saving page'+err});
					}
				});
			}
			else
			{
				console.log('POST: json page add div: page not found on db');
				//res.json({ 'error': 'POST: json page add div: page not found on db'});
			}
		}
	);
}
exports.appendDiv = appendDiv; 

function unlinkDiv(req, page_id, div, next) {
	var conditions = ( req.session.user_id == 'superadmin' ) 
	? 
	{ '_id': page_id } 
	: 
	{ '_id': page_id, 'author': req.session.user_id };
	req.app.jsl.page.findOne( conditions, [], {} )
	.run(function(err, page) {
		if ( !err ) {
			if ( page ) {
				//ho trovato la mia pagina
				//tolgo me stesso dai suoi divs
				for (var i = 0; i < page.divs.length; i++) {
					if ( page.divs[i].div == div ) {
						//trovato me stesso.
						//mi elimino
						//console.log('io e i miei fratelli:');
						//console.log(page.divs);
						page.divs.splice(i,1);
						//console.log('solo i miei fratelli:');
						//console.log(page.divs);
						
						//salvo la pagina con i figli modificati
						page.save(function(err) {
							if (!err) 
							{
								//ho salvato con successo
								next();
							}
							else
							{
								res.json({ 'error': 'unlinkDiv(): error saving page'});
							}
						});
						break;
					}
				}				
			} else {
				console.log('unlinkDiv(): page not found');
			}
		} else {
			console.log('unlinkDiv(): error in page query');
		}
	});	
}
exports.unlinkDiv = unlinkDiv; 


function render(app, req, res, page) {
	//console.log('###### page.render()');
	var pageOutput = '';
	var divsStructure = [];
	/*
	var divs = [
		{
			'partial' : 'h1  #{data.myVar},  #{data.myVar2}', //inteso come codice jade; sarà: '/page/json/render/:moduleDiv'
			'data' : {
				'myVar': 'the header',
				'myVar2': 'some more text'
			}
		},
		{
			'partial' : 'h6  #{data.myVar3},  #{data.myVar4}', //inteso come codice jade; sarà: '/page/json/render/:moduleDiv'
			'data' : {
				'myVar3': 'I am a span',
				'myVar4': 'indeed'
			}
		}
	];
	*/
	//console.log('page.divs PRIMA DI SORT');
	//console.log(page.divs);
	//ordino i div della mia pagina in base al loro order
	page.divs.sort(function (a, b){
		//Compare "a" and "b" in some fashion, and return -1, 0, or 1
		return (a.order - b.order);
	});
	//console.log('page.divs DOPO SORT');
	//console.log(page.divs);
	
	//ciclo sui div della mia pagina (solo su quelli indicati in page.divs, non faccio ricorsione ora), e creo un array con gli id che mi serve nel ciclo ricorsivo asincrono
	var pageDivs = [];
	for ( var i=0; i<page.divs.length; i++) {
		pageDivs.push(page.divs[i].div);
	}
	//console.log('pageDivs');
	//console.log(pageDivs);
	
	//prima devo fare un ciclo async per popolare tutta la struttura dati
	//cioè ricorsivamente popolo di figli di ogni divs
	loopOnPageDivs();
	function loopOnPageDivs() {
		if ( pageDivs.length > 0 ) {
			var divId = pageDivs.pop();
			recurse(divId,divsStructure,loopOnPageDivs);
			function recurse(divId,parent,next) {
				//leggo il mio div dal db
				//se sono superadmin vedo anche i non share
				var conditions = ( req.session.user_id == 'superadmin' ) 
				? 
				{ '_id': divId } 
				: 
				{ $or: [
					{ '_id': divId,  'status': 'share' },
					{ '_id': divId,  'author': req.session.user_id }
				]};
				app.jsl.div
				.findOne( conditions )
				//ora no: .populate('author')
				//ora no: .populate('children.div')
				.run(function(err, div) {
					//console.log(div);
					if ( !err )
					{
						//la query può andare a buon fine anche se non esiste un div col mio id e status: share,
						//in questo caso ritorna uno div null, quindi devo controllare se esiste lo div, altrimenti rimando in home
						if ( div )
						{
							//console.log('!!!trovato div:');
							//console.log(div);
							//creo un div clonato, che poi popolerò ricorsivamente con i figli del mio div
							var divPopulated = {
								'type': div.type,
								'class': div.class,
								'dom_id': div.dom_id,
								'inline_style': div.inline_style,
								'is_table': div.is_table,
								'children': [],
								'view': div.view,
								'controller': div.controller
							};
							
							
							
							//per ogni statement nel controller, devo fare un ciclo async che esegua i singoli statement,
							//che per ora possono essere solo query sui content
							
							//prima traslformo l'oggetto controller in un array di statements
							//lo faccio perchè il ciclo async vuole un array, non un oggetto, da cui fare pop()
							//console.log( '### devo eseguire tutto ciò che è indicato nel controller:' );
							var statements = [];
							if ( div.controller && div.controller != {} ) {
								var controllerJson = JSON.parse(div.controller);
								//console.log( controllerJson );
								for (var statement in controllerJson) {
									if ( controllerJson.hasOwnProperty(statement) && typeof controllerJson[statement] !== 'function') {
										//butto dentro a cazzo anche il nome dello statement, che altrimenti passando da un object
										//ad un array andrebbe perso
										controllerJson[statement].statementName = statement;
										statements.push(controllerJson[statement]);
										//console.log('## considero lo statement:'+statement);
										//console.log(controllerJson[statement]);
									}
								}
							}
							
							//poi eseguo il ciclo
							recurseOnStatements();
							function recurseOnStatements() {
								if ( statements.length > 0 ) {
									var statement = statements.shift(); //devo andare dal primo all'ultimo!
									//console.log('## considero lo statement per eseguirlo:');
									//console.log(statement);
									//devo eseguire la query rappresentata dallo statement
									//ora non differenzio in base a statement.type perchè gestisco solo il type 'find'
									//quindi proseguo eseguendo la query di find
									//##########################################################################################
									
									//definisco i permessi
									//nel caso di query per i siti degli utenti, non considero gli utenti loggati
									//quindi visualizzo solo public e share
									var conditions = {
										$or: [
											{ 'status': 'public' }, 
											{ 'status': 'share' }
										]
									};
									//QUI!!!
									//poi devo aggiungere le conditions che ha deciso l'utente per questo statement
									
									
									//console.log('conditions:');
									//console.log(conditions);
									//carico i mongoose models richiesti alla query
									app.jsl.jslModelController.loadMongooseModelFromId(app, statement.jslModel, function( modelName, fieldsToBePopulated ){
										//console.log('/contents/:modelId/:page?/:callback? -> finito di chiamare loadMongooseModelFromId con modelId = '+req.params.modelId);
										//console.log('fieldsToBePopulated:');
										//console.log(fieldsToBePopulated);
										//console.log('dove la metto qui dentro?');
										//console.log(app.mongoose.Query);
										//per via della paginazione, ogni query di list va preceduta da una query di count
										app.jsl['jslmodel_'+statement.jslModel].count(
											conditions,
											function(err, total) {
												if ( !err )
												{
													//console.log('count succeded');
													fieldsToBePopulated.push('jslModel');
													//procedo col find paginato
													app.jsl['jslmodel_'+statement.jslModel].find(
														conditions,
														//QUI!!! devo mettere la paginazione decisa per questo statement
														[], { 
															skip: req.session.skip, 
															limit: req.session.limit 
														})
													//.populate('jslModel')
													//QUI!!! i campi da popolare non li decide lo statement?
													.populateMulti(fieldsToBePopulated)
													//non va?? .sort('jslModel.name', -1)
													.sort('_id', -1)
													.run( function(err, contents) {
														if (!err) {
															//console.log('find succeded:');
															//console.log(contents);
															/*
															console.log('## dajeeeee, trovati i contents risultanti dal mio statement');
															console.log('total:');
															console.log(total);
															console.log('contents:');
															console.log(contents);
															*/
															//console.log('dovrei appendere i contents al divPopulated:');
															//console.log(divPopulated);
															//appendo il risultato del mio statement al div
															//alla fine il div avrà i risultati di tutti gli statements che
															//c'erano nel controller
															//console.log('statement.statementName:');
															//console.log(statement.statementName);
															if ( !divPopulated.data) divPopulated.data = {};
															divPopulated.data[statement.statementName] = contents;
															divPopulated.data[statement.statementName].total = total;
															//console.log('fatto!');
															recurseOnStatements();
															/*
															//per tutti i content renderizzo il tpl e glielo appendo. sarà poi il tpl list principale,
															//in un ciclo, a visualizzare i singoli tpl generati dinamicamente
															renderDynViewList(app, req, res, contents, function(){
																//adesso dentro a contents, per ciascun content c'è anche una property 'dynView' con il pezzo di tpl popolato con i propri content
																//next(contents,total);
															});
															*/
														} else {
															app.jsl.utils.errorPage(res, err, "page.render(): failed query find on db: "+err);
														}
													});
												}
												else
												{
													app.jsl.utils.errorPage(res, err, "page.render(): failed query count on db");
												}	
											}
										);
									}, false, true); //il 'true' significa che voglio caricare anche i models relazionati
									
									
									
									
									
									
									
									
									
									
									
									
									//##########################################################################################
									
									//doSomethingAsync(contentId, function() {
									//	recurseOnStatements();
									//});
									
									
									
								} else {
									//finito di eseguire ogni singolo statement
									//del controller del mio div
									//console.log('### finito di eseguire ogni singolo statement');
									//clono l'array dei figli del mio div
									var divChildren = [];
									for ( var j=0; j<div.children.length; j++) {
										divChildren.push(div.children[j].div);
									}
									//loop async su tutti i figli
									recurseOnChildren();
									function recurseOnChildren() {
										if (divChildren.length>0) {
											var divChild = divChildren.pop();
											//console.log("### ricorro su mio figlio: "+divChild);
											recurse(divChild,divPopulated.children,recurseOnChildren);
										} else {
											//finito di ricorrere sui miei elementi
											//aggiungo il div popolato all'array mio parent
											parent.push(divPopulated);
											//posso procedere
											next();
										}
									}
								}
							}
						}
						else
						{
							//non esiste un div share col mio id, quindi torno in home
							console.log('page.render(): div non trovato in db, torno in home');
							res.redirect('/');
						}
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "page.render(): query error retrieving div: "+divId);
					}
				});	
				
			}
		} else {
			//finito il popolamento dei dati
			//console.log('finitoooooooooo POPULATION ####################################');
			//for (var i=0;i<page.divs.length;i++) {
				//console.log(page.divs[i].div);
			//}
			//console.log('divsStructure');
			//console.log(divsStructure);
			
			
			
			
			//posso procedere con l'algoritmo sincrono che li compila
			while( divsStructure.length > 0 ) {
				var div = divsStructure.pop();
				compileRecursiveSync(div);
			}
			//console.log(pageOutput);
			//console.log('################################## finito anche compilazione sync');
			
			function compileRecursiveSync(div,divFatherType) {
				if (!divFatherType) divFatherType = ''; //se non mi passano divFatherType vuol dire che il mio div è nella root della pagina
				
				//renderizzo apertura del div
				if (div.is_table)
				{
					var divTag = "<table cellspacing='0' cellpadding='0' id='"+div.dom_id+"' ";
				}
				else
				{
					var divTag = "<div id='"+div.dom_id+"' ";
				}
				
				//renderizzo class
				var divClass = " class=' "; 
				if (div.class != "")
				{
					divClass += " "+div.class+" ";
				}
				divClass += "' ";
				
				//renderizzo style
				var divStyle = " style='"; 
				//if not override, add generated styles to style tag
				if (div.inline_style)
				{
					switch ( divFatherType )
					{
						case "horizCont":
							divStyle += " float:left; display:inline; ";
							break;
						case "vertCont":
							divStyle += " clear:both; ";
							break;
						case "":
							//this is the special case of root div for my page
							//questi li usavo in ooogui, in cui però una pagina aveva sempre e solo un div di root, non molteplici: divStyle += " margin:0 auto; ";
							divStyle += " clear:both; "; //ora per i div di root mi comporto come se loro padre fosse un vertical container
							break;
					}
				}
				//close style tag
				divStyle +=  " ' ";
				
				//metto in output il div, con eventuale apertura della tabella
				if (div.is_table)
				{
					pageOutput +=  divTag+divClass+" ><tbody>\n";
				}
				else
				{
					pageOutput +=  divTag+divClass+divStyle+" >\n";
				}
				
				
				//renderizzo il contenuto del div, in base al suo tipo
				switch ( div.type )
				{
					case "horizCont":
					case "vertCont":
						//genero i container solo se non sto renderizzando un modulo unico
						var divChildren = div.children;
						if (divChildren.length>0)
						{
							if ( div.is_table && div.type == "horizCont" )
							{
								pageOutput +=  "<tr>";
							}
							for (var i=divChildren.length-1; i>=0; i--) //loop in ordine inverso
							{
								if ( div.is_table )
								{
									if ( div.type == "vertCont" )
									{
										pageOutput +=  "<tr>";
									}				
									pageOutput +=  "<td class='tableColumn'>";
								}
								
								//$this->render( divChildren[i]->id_div_child, div.type, $myDivId ); //recursion
								compileRecursiveSync(divChildren[i],div.type);
								
								if ( div.is_table )
								{
									if ( div.type == "vertCont" )
									{
										pageOutput +=  "</tr>";
									}
									pageOutput +=  "</td>";
								}
							}
							if ( div.is_table && div.type == "horizCont" )
							{
								pageOutput +=  "</tr>";
							}
						}
						
						//at the end of a container, display a "closure" invisible div, that grants that the container will grow its size to fully contain its children divs
						//must do that beacause, in horizontal containers, children are floating (left), and floating divs "come out" from the parent container layout
						if ( div.type == "horizCont" && div.inline_style && !div.is_table )
						{
							pageOutput +=  "<div style='clear:both;'></div>";
						}
						break;
					case "module":
						//se sto renderizzando come tabella, allora devo aprire una riga con una cella per il contenuto del mio modulo
						if (div.is_table)
						{
							pageOutput +=  "<tr><td>";
						}
						//QUI!!!
						//quando avrò a disposizione anche i dati derivanti dall'esecuzione del controller, allora dovrò passarli al compile di jade
						
						//compilo la mia view
						if (div.view) {
							var jade = require('jade');
							var jadetemplate = jade.compile(div.view.toString('utf8'));
							//console.log('sto per compilare un tpl con sti data:');
							//console.log(div.data);
							pageOutput += jadetemplate({
								//per ora non ho ancora data da passare:
								data: div.data
							});
							
							//pageOutput +=  'MODULO: '+div.view;
							/*
							if ( $myModule->template == "" && $myModuleClassName == "" )
							{
								//se non c'è nulla, non faccio nulla
							}
							else if ( $myModule->template != "" && $myModuleClassName == "" )
							{
								//se c'è solo un template, visualizzo quello
								$mySmarty = new Smartybase();
								$mySmarty->smarty->assign("params", $myModuleParams);
								$mySmarty->smarty->assign("moduleTitle", utf8_encode($myModule->name));
								$mySmarty->smarty->assign("moduleDescription", utf8_encode($myModule->name_description));
								$mySmarty->smarty->assign("site", utf8_encode($this->site));
								$mySmarty->smarty->assign("currentLan", $this->currentLan);
								$mySmarty->smarty->assign("pageName", $_GET["page"]);
								$mySmarty->smarty->assign("pageTitle", $this->pageTitle);
								$mySmarty->smarty->display("noModule/"+$myModule->template);
							}
							else if ( $myModule->template != "" && $myModuleClassName != "" )
							{
								//ci sono sia template che classe, quindi istanzio la classe (e le passo il template che visualizzerà lei)
								$myModuleClass = new $myModuleClassName($this->site, $myModule->name,$myModule->name_description,$myModuleClassName+"/"+$myModule->template,$myModuleParams,$myModule->id_module,$this->is_newsletter);
							}
							*/
						}
						
						
						//se sto renderizzando come tabella, allora devo chiudere una riga con una cella per il contenuto del mio modulo
						if (div.is_table)
						{
							pageOutput +=  "</td></tr>";
						}
						
						
						break;
				}
				
				//chiudo il div o la tabella
				if (div.is_table)
				{
					pageOutput +=  "</tbody></table> ";
				}
				else
				{
					pageOutput +=  "</div> ";
				}
			}
			
			
			
			//finito anche la compilazione


			/* QUESTO FUNZIA, MA ERA SOLO PER TESTING
			//poi ciclo su ogni div, e renderizzo il partial jade in una relativa stringa html, con anche le variabili compilate col proprio valore
			//in pratica uso il compilatore di jade direttamente, e non attraverso il solito res.render()
			var jade = require('jade');
			for (var i=0; i<divs.length; i++) {
				var jadechunk = divs[i].partial;
				var jadetemplate = jade.compile(jadechunk.toString('utf8'));
				divs[i].content = jadetemplate({
					data: divs[i].data
				});
				
			}
			*/
		
		
			/*
			//usare jade dinamicamente
			var jade = require('jade');
			var jadechunk = "h1 #{myVar}!";
			var jadetemplate = jade.compile(jadechunk.toString('utf8'));
			var jadeoutput = jadetemplate({
				myVar: 'myValue'
			});
			*/
			
			
			//poi l'array derivante dalla query viene dato ad un res.render sul layout che renderizza i partials
			res.render('pageRender', {
				'layout': 'layoutRender', 
				'page': page,
				//'divs': divs,
				//'debug': 'will render the page - '+page.route+" - from the site - "+page.site.domain+" - ",
				'pageOutput': pageOutput
			});
			
			
			
			
			
			
			
			
			
		}
	}
	
	
	
	
	
	
	
	
	
	
	
	/*
	res.render('debug', {
		layout: false, 
		variable: 'altro ancora'
	});
	*/
}
exports.render = render;




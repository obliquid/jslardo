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
element
*/

function defineRoutes(app) {

	//GET: element list
	app.get('/elements/:page?', app.jsl.perm.readStrucPermDefault, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli element dal db, e assegno il result al tpl
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
			//alle conditions devo appendere anche la condizione sul filtraggio per model, se definita
			if ( req.session.filterByModel )
			{
				//console.log('dovrei filtrare per model: '+req.session.filterByModel+' con queste conditions:');
				conditions.jslModel = req.session.filterByModel;
				//console.log(conditions);
			}
			
			
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.element.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.element.find(
							conditions,
							[], { 
								skip: req.session.skip, 
								limit: req.session.limit 
							})
						.populate('jslModel')
						//non va?? .sort('jslModel.name', -1)
						.sort('_id', -1)
						.run( function(err, elements) {
							//prima di renderizzare la lista, mi serve la lista dei jslModel per il combo
							app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
								//trovato anche la lista per i combo
								//ora devo popolare ogni singolo element anche con il suo content dinamico prerenderizzato
								renderAndMergeDynList(app, req, res, elements, function() {
									//adesso dentro ad elements, per ciascun element c'è anche una property 'renderedContent' con il pezzo di tpl popolato con i propri content
									//procedo con il rendering della lista
									res.render('elements/list', { 
										elementName: 'element',
										elements: elements,
										pagination: app.jsl.pag.paginationDo(req, total, '/elements/'),
										combo_jslModels: jslModels
									});	
								});
								
							});
								
								
						});
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "GET: element list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: element detail 
	app.get('/elements/:id', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//leggo il mio element dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.element
			.findOne( conditions )
			.populate('author')
			.populate('jslModel')
			.run(function(err, element) {
				//console.log(element);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un element col mio id e status: share,
					//in questo caso ritorna uno element null, quindi devo controllare se esiste lo element, altrimenti rimando in home
					if ( element )
					{
						//devo popolare anche i contenuti dinamici
						getContentInstance(app, element.jslModel._id, element._id, function(content) {
							if (content) {
								//pre-renderizzo il blocco di detail relativo al contanuto dinamico
								renderDynView(app, req, res, 'detail', JSON.parse(element.jslModel.jslSchema), content, function(renderedView) {
									//ora che ho anche i contents del mio element, posso renderizzare il detail
									res.render('elements/detail', { 
										elementName: 'element',
										element: element,
										dynView: renderedView
									});
								});
							} else {
								app.jsl.utils.errorPage(res, err, "GET: element detail: getContentInstance() returned false");
							}
						});						
					}
					else
					{
						//non esiste un element share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: element detail: query error");
				}
			});	
	});
	
	//GET: element form (new)
	app.get('/elements/edit/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		//(devo ovviamente popolare solo il combo con i miei models)
		app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
			//ho trovato anche i jslModels per popolare il combo
			//creo un element vuoto perchè devo comunque passargli alcune properties essenziali anche per un new, cioè l'id del model
			var element = {};
			//se il mio user sta filtrando su un model (session.filterBySite è definito) allora preimposto il jslModel della nuova page
			if ( req.session.filterByModel != '' && req.session.filterByModel != undefined )
			{
				element.jslModel = req.session.filterByModel;
				//essendo definito il model, posso popolare il dynForm, che altrimenti resterebbe vuoto in attesa che venga scelto un model
				//pre-renderizzo il blocco di form relativo al contanuto dinamico
				renderDynForm(app, req, res, element.jslModel, function(renderedForm) {
					//renderizzo il form finale senza il dynForm
					res.render('elements/form', { 
						title: app.i18n.t(req,'create new element'),
						elementName: 'element',
						element: element,
						dynForm: renderedForm,
						combo_jslModels: jslModels
					});	
				});
				
			} else {
				//renderizzo il form finale senza il dynForm
				res.render('elements/form', { 
					title: app.i18n.t(req,'create new element'),
					elementName: 'element',
					element: element,
					dynForm: '',
					combo_jslModels: jslModels
				});	
			}
		});
	});
	//POST: element form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/elements/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//creo nuovo element
		var my_element = new app.jsl.element();
		//popolo il mio element con quanto mi arriva dal form
		app.jsl.utils.populateModel(my_element, req.body);
		//assegno l'author (non gestito dal form ma impostato automaticamente)
		my_element.author = req.session.user_id;
		//inizializzo la data di creazione (che non è gestita dal form)
		my_element.created = new Date();
		//salvo il nuovo element
		my_element.save(function (err) {
			if (!err) 
			{
				//ho creato con successo il mio element nuovo
				//ora devo salvare i suoi contenuti dinamici
				/*
				console.log('vediamo cosa mi arriva da salvare:');
				console.log(req.body);
				console.log('vediamo cosa ho salvato:');
				console.log(my_element);
				*/
				//creo un'istanza di contenuti per il mio model
				newContentInstance(app, my_element.jslModel, function( newInstance ) {
					//var anInstance = newInstance;
					//popolo l'istanza con quanto mi arriva dal form
					app.jsl.utils.populateModel(newInstance, req.body);
					//aggiungo a mano l'id del mio element
					newInstance.element = my_element.id;
					newInstance.save(function (err) {
						if (!err) {
							//console.log('tutto ok, avrei salvato il contenuto dinamico');
							//e rimando nel form
							res.redirect('/elements/edit/'+my_element.id+'/success');
						} else {
							console.log('errore salvando il contenuto dinamico');
							app.jsl.utils.errorPage(res, err, "POST: jslModel form: saving dynamic content of an element");
						}
					});
				});
			}
			else
			{
				app.jsl.utils.errorPage(res, err, "POST: element form: saving element");
			}
		});
	});	
	
	//GET: element form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/elements/edit/:id/:msg?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnElementId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio element dal db, e assegno il result al tpl
		app.jsl.element.findOne( { '_id': req.params.id } )
		.run( function(err, element) {
			if (!err)
			{
				//(devo ovviamente popolare il combo con i miei models)
				app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
					//devo leggere anche il contenuto del form dinamico, per poterlo popolare
					getContentInstance(app, element.jslModel, element._id, function(content) {
						if (content) {
							//pre-renderizzo il blocco di form relativo al contanuto dinamico
							renderDynForm(app, req, res, element.jslModel, function(renderedForm) {
								//ora che ho anche i contents del mio element, posso renderizzare il form finale popolato
								res.render('elements/form', { 
									title: app.i18n.t(req,'modify element'),
									elementName: 'element',
									element: element,
									msg: req.params.msg,
									dynForm: renderedForm,
									combo_jslModels: jslModels
								});	
							}, jslModels, content);
						} else {
							app.jsl.utils.errorPage(res, err, "GET: element form (modify): getContentInstance() returned false");
						}
					});
				});
			}
			else
			{
				app.jsl.utils.errorPage(res, err, "GET: element form (modify): failed query on db");
			}	
				
		});	
	});
	//POST: element form (modify)
	//il controllo sull'unicità del nome di ogni field viene fatto nel client
	app.post('/elements/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnElementId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima trovo il mio element da modificare nel db
		app.jsl.element.findOne(
			{ '_id': req.params.id },
			function(err, element) {
				if (!err)
				{
					//ho recuperato dal db con successo il mio element da modificare
					//popolo il mio element con quanto mi arriva dal form
					app.jsl.utils.populateModel(element, req.body);
					//salvo lo element modificato
					element.save(function(err) {
						//ora devo salvare i suoi contenuti dinamici
						//prima carico da db i contenuti del mio element attualmente nel db
						getContentInstance(app, element.jslModel, element._id, function( contentInstance ) {
							if ( contentInstance ) {
								//quindi popolo l'istanza dei contenuti con quanto mi arriva dal form
								//(dalla parte dynForm del form mi arrivano i contenuti per qui)
								app.jsl.utils.populateModel(contentInstance, req.body);
								//aggiungo a mano l'id del mio element
								//questa non serve perchè la mia istanza arriva dal db ed ha già l'id impostato: contentInstance.element = element.id;
								//quindi salvo anche i contenuti
								contentInstance.save(function (err) {
									if (!err) {
										//console.log('tutto ok, avrei salvato il contenuto dinamico');
										//e rimando nel form
										res.redirect('/elements/edit/'+element.id+'/success');
									} else {
										console.log('elements/edit/:id - errore salvando il contenuto dinamico');
										app.jsl.utils.errorPage(res, err, "POST: element form (modify):error saving dynamic content of an element");
									}
								});
							} else {
								console.log('elements/edit/:id - getContentInstance returnet false');
								app.jsl.utils.errorPage(res, err, "POST: element form (modify): getContentInstance returnet false");
							}
						});
					});
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: element form (modify): element not found on db");
				}
			}
		);
	});
	
	//GET: element delete
	app.get('/elements/delete/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnElementId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima leggo l'element da cancellare dal db, perchè mi deve fornire l'id del model
		app.jsl.element.findOne(
			{ '_id': req.params.id },
			function(err, element) {
				if ( err ) {
					app.jsl.utils.errorPage(res, err, 'GET: element delete: failed getting element from db');
				} else {
					//trovato il mio element (con l'id del suo model)
					//posso eliminare dal db l'istanza del content
					deleteContentInstance(app, element.jslModel, element._id, function (result) {
						if ( result ) {
							//posso cancellare l'element
							app.jsl.element.remove(
								{ '_id': req.params.id },
								function(err, result) {
									if ( err ) {
										app.jsl.utils.errorPage(res, err, 'GET: element delete: failed deleting element');
									} else {
										//faccio un redirect sulla lista
										res.redirect('/elements');
									}
								}
							);
						} else {
							app.jsl.utils.errorPage(res, err, 'GET: element delete: deleteContentInstance returned false');
						}
					});
					
					
					
				}
			}
		);
	});



		
	
	
	
	
	
	
	
	//JSON ROUTES

	//POST: element render dynamic form
	//non ha controlli sui permessi, che vengono fatti invece solo in fase di save
	app.post('/json/elements/renderDynForm/:modelId', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		
		renderDynForm(app, req, res, req.params.modelId, function(renderedForm) { res.json(renderedForm); });
		
		
		
		//console.log(req.params);
		//appendDiv(req, req.params.page, req.params.div, req.params.ord, function(){ res.json(); });
	});	
	


		
	
}
exports.defineRoutes = defineRoutes;

/*
//questo metodo ritorna una lista di tutti i siti visibili dall'utente corrente
//in base al fatto che sia loggato o meno, e che sia superadmin o meno
function getElements(req,res,closure)
{
	//prima di tutto distinguo se sono loggato o meno
	if ( req.session.loggedIn )
	{
		//poi distinguo se sto filtrando solo sui miei elementi o su tutti (quelli visibili)
		if ( req.session.filterAllOrMine == 'mine' )
		{
			//voglio vedere solo i miei siti (questa condizione non può avvenire se sono superadmin, quindi non sono sicuramente superadmin)
			//e sono loggato, quindi vedrò solo i miei
			var conditions = { 'author': req.session.user_id };
		}
		else
		{
			//voglio vedere tutti i siti
			//e sono loggato, quindi devo distinguere se sono superadmin(vedo tutti i element) o no (vedo solo gli share o i miei)
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
		//se non sono loggato, vedo solo gli share
		var conditions = { 'status': 'share' };
	}
	//poi eseguo la query
	req.app.jsl.element
		.find( conditions, [], { sort: ['title', 'ascending'] } )
		//.populate('author')
		.run(function(err, elements) {
			if ( !err )
			{
				//la query può andare a buon fine anche se non esiste un element che rispetti le conditions
				//in questo caso ritorna uno element null, quindi devo controllare se esiste lo element
				if ( elements )
				{
					//ho trovato dei siti
					closure(elements);
				}
				else
				{
					//non ho trovato nessun element, ritorno niente
					closure();
				}
			}
			else
			{
				req.app.jsl.utils.errorPage(res, err, "element.getElements(): query error");
			}
		});	
}
exports.getElements = getElements;
*/

//ritorna un'istanza nuova (quindi non popolata) di un model di mongoose creato dinamicamente
//non ha controlli di sicurezza, va usata solo internamente
function newContentInstance(app, modelId, next) {
	app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
		next( new app.jsl[modelName]() );
	});
}
exports.newContentInstance = newContentInstance;

//ritorna un'istanza salvata nel db di un model di mongoose creato dinamicamente
//non ha controlli di sicurezza, va usata solo internamente
function getContentInstance(app, modelId, elementId, next) {
	app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
		//caricato il model mongoose, posso farci sopra una query
		app.jsl[modelName].findOne( { 'element': elementId } )
		.run(function(err, content) {
			//console.log(element);
			if ( !err )
			{
				//la query può andare a buon fine anche se non esiste un content col mio id
				if ( content )
				{
					//console.log('getContentInstance(): dal db mi arriva content: ');
					//console.log(content);
					//trovato il content
					//lo ritorno
					next(content);
				}
				else
				{
					//non esiste un element col mio id, quindi torno in home
					console.log('getContentInstance(): no content instance found on db');
					next(false);
				}
			}
			else
			{
				console.log('getContentInstance(): query error retrieving content instance');
				next(false);
			}
		});	
	});
}
exports.getContentInstance = getContentInstance;

//elimina un'istanza salvata nel db di un model di mongoose creato dinamicamente
//non ha controlli di permessi, va usata solo internamente
function deleteContentInstance(app, modelId, elementId, next) {
	app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
		//caricato il model mongoose, posso cancellare l'istanza del content
		app.jsl[modelName].remove( { 'element': elementId }, function(err, result) {
			//console.log(element);
			if ( !err )
			{
				next(true);
			}
			else
			{
				console.log('deleteContentInstance(): query error deleting content instance');
				next(false);
			}
		});	
	});
}
exports.deleteContentInstance = deleteContentInstance;



//questo renderizza ricorsivamente il form partendo dallo schema del model (anche se l'algoritmo ricorsivo vero è proprio è parseSchema())
//come parametro obbligatorio modelId vuole l'id del model da cui devo leggere lo schema per generare il form
//come parametro facoltativo jslModels vuole un array di models tra cui ci deve essere il mio (serve per riutilizzare oggetti e non fare query inutili)
//come parametro facoltativo content vuole l'istanza popolata del content del mio element per poter prepopolare il form, che altrimenti verrebbe generato vuoto
//ritorna una stringa html con tutti i campi input (ecc.) del form (ma non il tag form)
function renderDynForm(app, req, res, modelId, next, jslModels, content) {
	/*
	console.log('modelId:');
	console.log(modelId);
	console.log('jslModels:');
	console.log(jslModels);
	*/
	var schema = {};
	if ( typeof jslModels === 'object' && jslModels.length > 0 ) {
		//console.log('use jslModels');
		//mi hanno passato i models, trovo il mio senza dover fare una query
		for ( var i=0; i<jslModels.length; i++) {
			//console.log('confronto jslModels[i]._id('+jslModels[i]._id+') con modelId('+modelId+')');
			if ( String(jslModels[i]._id) == String(modelId) ) {
				//console.log('sono uguali!');
				schema = jslModels[i].jslSchema;
				//console.log('trovato schema dagli argomenti:');
				parseSchema(app,schema,content,next);
				//console.log('jslModels[i].jslSchema:');
				//console.log(jslModels[i].jslSchema);
				break;
			}
		}
	} else {
		//devo fare la query per trovare il mio model, e quindi lo schema
		//console.log('do query');
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': modelId } 
		: 
		{ $or: [
			{ '_id': modelId,  'status': 'share' },
			{ '_id': modelId,  'author': req.session.user_id }
		]};
		app.jsl.jslModel.findOne( conditions )
		//.populate('author')
		.run(function(err, jslModel) {
			//console.log(jslModel);
			if ( !err )
			{
				//la query può andare a buon fine anche se non esiste un jslModel col mio id e status: share,
				//in questo caso ritorna uno jslModel null, quindi devo controllare se esiste lo jslModel, altrimenti rimando in home
				if ( jslModel )
				{
					//trovato il model, e quindi lo schema
					schema = jslModel.jslSchema;
					//console.log('trovato schema dalla query:');
					parseSchema(app,schema,content,next);
				}
				else
				{
					//non esiste un jslModel share col mio id, quindi torno in home
					console.log('renderDynForm(): no model found');
					next({});
				}
			}
			else
			{
				console.log('renderDynForm(): query error');
				next({});
			}
		});	
	}
}

/*
questo è il vero algoritmo, ora non ricorsivo ma magari in futuro..., che renderizza il form, campo per campo
*/
function parseSchema(app, schema,content,next) {
	//console.log('parseSchema(): mi passano lo schema:');
	//console.log(schema);
	//init quello che mi serve
	var jade = require('jade');
	var fs = require('fs');
	var dynFormRendered = ''; //qui ci andrà tutto il form renderizzato, ed è il return di questa function
	//jsonizzo
	schema = JSON.parse(schema);
	//implementazione non ricorsiva
	//ciclo su tutti i field dello schema
	var counter = 0;
	for (field in schema) {
		if ( schema.hasOwnProperty(field) && typeof schema[field] !== 'function') {
			//console.log('considero il field: '+field+' che vale '+schema[field]);
			//apro il relativo template
			//questa potrebbe supportare un caching
			var templateFilename = 'views/includes/dynForm/'+schema[field].type+'.jade';
			var dynForm = fs.readFileSync(templateFilename, 'utf8');
			//compilo il template
			//no so perchè ma il compile, oltre al contenuto del template, vuole anche il file altrimenti non vanno gli include
			//forse perchè dal path assoluto del file capisce il path relativo per gli includes
			var dynFormCompiled = jade.compile(dynForm.toString('utf8'), {filename: templateFilename});
			var icon = '/images/pov/'+app.jsl.utils.datatypeByName(schema[field].type).icon+'_40x30.png';
			//se mi hanno passato un content popolo il template del form anche con quello, altrimenti popolo solo con il nome del field
			if ( content ) {
				//popolo il template
				dynFormRendered += dynFormCompiled({
					field: field,
					icon: icon,
					counter: counter,
					description: schema[field].description,
					required: schema[field].required,
					element: content,
					__i: app.i18n.__,
					trunc: app.jsl.utils.trunc
				});
			} else {
				//popolo il template
				dynFormRendered += dynFormCompiled({
					field: field,
					icon: icon,
					counter: counter,
					description: schema[field].description,
					required: schema[field].required,
					element: {},
					__i: app.i18n.__,
					trunc: app.jsl.utils.trunc
				});
			}
			counter++;
		}
	}
	next( dynFormRendered );
}


function renderDynView(app, req, res, type, schema, content, next) {
	var jade = require('jade');
	var fs = require('fs');
	var dynViewRendered = '';
	//number of fields to be visualized for list type
	var listFieldsNum = 2; 
	//ciclo sui field del schema
	var counter = 0;
	for ( field in schema ) {
		//se non ho content per questo field, skippo
		if (
			content[field] !== false && ( content[field] === undefined || content[field] == '' )
		) continue;
		//se sono il list mode, limito il numero di fields ritornati
		if ( type == 'list' && counter >= listFieldsNum ) break;
		//console.log(schema[field]);
		//questa potrebbe supportare un caching
		if ( type == 'detail') {
			var templateFilename = 'views/includes/dynDetail/'+schema[field].type+'.jade';
		} else if ( type == 'list') {
			var templateFilename = 'views/includes/dynList/'+schema[field].type+'.jade';
		}
		var dynView = fs.readFileSync(templateFilename, 'utf8');
		//compilo il template
		var dynViewCompiled = jade.compile(dynView.toString('utf8'), {filename: templateFilename});
		var icon = '/images/pov/'+app.jsl.utils.datatypeByName(schema[field].type).icon+'_40x30.png';
		//popolo il template
		dynViewRendered += dynViewCompiled({
			field: field,
			description: schema[field].description,
			icon: icon,
			content: content,
			__i: app.i18n.__,
			trunc: app.jsl.utils.trunc
		});
		counter++;
	}
	next(dynViewRendered);
}

/*
questo metodo popola ogni element dell'array elements con anche il tpl renderizzato del suo content.
elements, essendo passato per reference, viene modificato, senza bisogno di rotrnarlo
*/
function renderAndMergeDynList(app, req, res, elements, next ) {
	//creo un array con i soli id dei miei elements
	var elementsId = [];
	for ( var i=0; i<elements.length; i++) {
		elementsId.push(elements[i]._id);
	}
	//console.log(elementsId);
	//ciclo su ogni element, e gli appendo il relativo content renderizzato
	recurse();
	function recurse() {
		if ( elementsId.length > 0 ) {
			var elementId = elementsId.pop();
			//leggo dall'array elements quello col mio id
			for ( var i=0; i<elements.length; i++) {
				if ( elements[i]._id == elementId ) {
					var element = elements[i];
					break;
				}
			}
			//nome del model nel db
			var modelName = 'jslmodel_'+element.jslModel._id;
			//carico sempre il model (se è già caricato non c'è overhead)
			app.jsl.jslModelController.loadMongooseModelFromId(app, element.jslModel._id, function(){
				app.jsl[modelName].findOne({ 'element': elementId})
				.run(function(err,content){
					if ( !err ) {
						if ( content ) {
							//console.log('trovato content:');
							//console.log(content);
							//ora che ho il content, renderizzo il tpl per lui e lo appendo al mio element
							renderDynView(app, req, res, 'list', JSON.parse(element.jslModel.jslSchema), content, function(renderedView) {
								element.dynView = renderedView;
							});
							recurse();
						} else {
							console.log('renderAndMergeDynList(): not found a content for elementId:'+elementId+' and this modelName:'+modelName);
							recurse();
						}
					} else {
						console.log('renderAndMergeDynList(): query error retrieving contents: '+err);
					}
				});
			});
		} else {
			//finito
			next();
		}
	}
}



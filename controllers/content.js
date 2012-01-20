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
content
*/

function defineRoutes(app) {

	//GET: content list
	app.get('/contents/:modelId/:page?/:callback?', app.jsl.perm.readStrucPermDefault, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli content dal db, e assegno il result al tpl
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
			
			//carico i mongoose models richiesti alla query
			//console.log('/contents/:modelId/:page?/:callback? -> chiamo loadMongooseModelFromId con modelId = '+req.params.modelId);
			app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function( modelName, fieldsToBePopulated ){
				//console.log('/contents/:modelId/:page?/:callback? -> finito di chiamare loadMongooseModelFromId con modelId = '+req.params.modelId);
				//per via della paginazione, ogni query di list va preceduta da una query di count
				app.jsl['jslmodel_'+req.params.modelId].count(
					conditions,
					function(err, total) {
						if ( !err )
						{
							//procedo col find paginato
							app.jsl['jslmodel_'+req.params.modelId].find(
								conditions,
								[], { 
									skip: req.session.skip, 
									limit: req.session.limit 
								})
							.populate('jslModel')
							.populate(fieldsToBePopulated)
							//non va?? .sort('jslModel.name', -1)
							.sort('_id', -1)
							.run( function(err, contents) {
								//per tutti i content renderizzo il tpl e glielo appendo. sarà poi il tpl list principale,
								//in un ciclo, a visualizzare i singoli tpl generati dinamicamente
								renderDynViewList(app, req, res, contents, function(){
									//adesso dentro ad contents, per ciascun content c'è anche una property 'dynView' con il pezzo di tpl popolato con i propri content
									//procedo con il rendering della lista
									if ( req.params.callback ) {
										var layout = 'layoutPopup';
										var callback = req.params.callback;
									} else {
										var layout = true;
										var callback = '';
									}
									res.render('contents/list', {
										layout: layout,
										elementName: 'content',
										elements: contents,
										pagination: app.jsl.pag.paginationDo(req, total, '/contents/'+req.params.modelId+'/'),
										//////combo_jslModels: jslModels,
										callback: callback
									});	
								});
							});
						}
						else
						{
							app.jsl.utils.errorPage(res, err, "GET: content list: failed query on db");
						}	
					}
				);
			}, false, true); //il 'true' significa che voglio caricare anche i models relazionati
		}
		else
		{
			next();
		}
	});
	
	//GET: content detail 
	app.get('/contents/:modelId/:id', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//leggo il mio content dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		
		//carico i models di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function( modelName, fieldsToBePopulated ){
			app.jsl['jslmodel_'+req.params.modelId]
			.findOne( conditions )
			//QUI!! popolo il resto?
			.populate('author')
			.populate('jslModel')
			.run(function(err, content) {
				//console.log(content);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un content col mio id e status: share,
					//in questo caso ritorna uno content null, quindi devo controllare se esiste lo content, altrimenti rimando in home
					if ( content )
					{
						////////devo popolare anche i contenuti dinamici
						////////getContentInstance(app, element.jslModel._id, element._id, function(content) {
						//////getContentInstance(app, element, function(content) {
							//////if (content) {
								//pre-renderizzo il blocco di detail relativo al contanuto dinamico
								renderDynView(app, req, res, 'detail', JSON.parse(content.jslModel.jslSchema), content, function(renderedView) {
									//ora che ho anche i contents del mio content, posso renderizzare il detail
									res.render('contents/detail', { 
										elementName: 'content',
										element: content,
										dynView: renderedView
									});
								});
							//////} else {
								////////non ho contenuto dinamico, renderizzo il detail non popolato
								////////console.log("GET: element detail: getContentInstance() returned false");
								//////res.render('elements/detail', { 
									//////elementName: 'element',
									//////element: element,
									//////dynView: ''
								//////});
							//////}
						//////});						
					}
					else
					{
						//non esiste un content share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: content detail: query error");
				}
			});	
		}, false, true);
	});
	
	//GET: content form (new)
	app.get('/contents/:modelId/edit/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		//(devo ovviamente popolare solo il combo con i miei models)
		app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
			//ho trovato anche i jslModels per popolare il combo
			//creo un content vuoto perchè devo comunque passargli alcune properties essenziali anche per un new, cioè l'id del model
			var content = {};
			content.jslModel = { _id : req.params.modelId };
			//se il mio user sta filtrando su un model (session.filterBySite è definito) allora preimposto il jslModel della nuova page
			if ( req.params.modelId != '' && req.params.modelId != undefined )
			{
				content.jslModel = req.params.modelId;
				//essendo definito il model, posso popolare il dynForm, che altrimenti resterebbe vuoto in attesa che venga scelto un model
				//pre-renderizzo il blocco di form relativo al contanuto dinamico
				renderDynForm(app, req, res, content.jslModel, function(renderedForm) {
					//renderizzo il form finale senza il dynForm
					res.render('contents/form', { 
						title: app.i18n.t(req,'create new content'),
						elementName: 'content',
						element: content,
						dynForm: renderedForm,
						combo_jslModels: jslModels
					});	
				});
				
			} else {
				//renderizzo il form finale senza il dynForm
				res.render('contents/form', { 
					title: app.i18n.t(req,'create new content'),
					elementName: 'content',
					element: content,
					dynForm: '',
					combo_jslModels: jslModels
				});	
			}
		});
	});
	//POST: content form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/contents/:modelId/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//creo nuovo content
		var my_content = new app.jsl['jslmodel_'+req.params.modelId]();
		//assegno il model (non gestito dal form ma impostato automaticamente)
		my_content.jslModel = req.params.modelId;
		//assegno l'author (non gestito dal form ma impostato automaticamente)
		my_content.author = req.session.user_id;
		//inizializzo la data di creazione (che non è gestita dal form)
		my_content.created = new Date();
		//popolo il mio content con quanto mi arriva dal form
		//////app.jsl.utils.populateModel(my_content, req.body);
		app.jsl.utils.populateContentModel(app, req, res, my_content, req.body, function(){
			//salvo il nuovo content
			my_content.save(function (err) {
				if (!err) 
				{
					//ho creato con successo il mio content nuovo
					//ora devo salvare i suoi contenuti dinamici
					/*
					console.log('vediamo cosa mi arriva da salvare:');
					console.log(req.body);
					console.log('vediamo cosa ho salvato:');
					console.log(my_content);
					*/
					////////creo un'istanza di contenuti per il mio model
					//////newContentInstance(app, my_element.jslModel, function( newInstance ) {
						////////var anInstance = newInstance;
						////////aggiungo a mano l'id del mio element
						//////newInstance.element = my_element.id;
						////////popolo l'istanza con quanto mi arriva dal form
						////////ok, ma non gestisce gli ObjectId: app.jsl.utils.populateModel(newInstance, req.body);
						//////app.jsl.utils.populateContentModel(app, req, res, newInstance, req.body, function(){
							////////finalmente salvo l'istanza di element popolata con i contenuti dinamici
							//////newInstance.save(function (err) {
								//////if (!err) {
									////////console.log('tutto ok, avrei salvato il contenuto dinamico');
									//e rimando nel form
									res.redirect('/contents/'+req.params.modelId+'/edit/'+my_content.id+'/success');
								//////} else {
									//////console.log('errore salvando il contenuto dinamico');
									//////app.jsl.utils.errorPage(res, err, "POST: element form: saving dynamic content of an element");
								//////}
							//////});
						//////});
					//////});
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: content form: saving content");
				}
			});
		});
	});	
	
	//GET: content form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/contents/:modelId/edit/:id/:msg?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnContentId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//carico i model di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function(modelName, fieldsToBePopulated){
			//mi hanno passato l'id obbligatoriamente
			//leggo il mio content dal db, e assegno il result al tpl
			app.jsl['jslmodel_'+req.params.modelId].findOne( { '_id': req.params.id } )
			.populate('jslModel')
			//QUI!!! devo popolare anche i fieldsToBePopulated? se no non caricarne nemmeno i models mongoose
			.run( function(err, content) {
				if (!err)
				{
					if ( content ) {
						//(devo ovviamente popolare il combo con i miei models)
						app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
							////////devo leggere anche il contenuto del form dinamico, per poterlo popolare
							////////getContentInstance(app, element.jslModel, element._id, function(content) {
							//////getContentInstance(app, element, function(content) {
								////////if (content) {
									//pre-renderizzo il blocco di form relativo al contanuto dinamico
									renderDynForm(app, req, res, req.params.modelId, function(renderedForm) {
										//ora che ho anche il blocco di form dinamico, posso renderizzare il form finale
										res.render('contents/form', { 
											title: app.i18n.t(req,'modify content'),
											elementName: 'content',
											element: content,
											msg: req.params.msg,
											dynForm: renderedForm,
											combo_jslModels: jslModels
										});	
									}, jslModels, content);
								////////} else {
									////////console.log("GET: element form (modify): getContentInstance() returned false");
									////////non ho contenuti, visualizzo il form senza popolarlo coi contenuti dinamici
									////////res.render('elements/form', { 
										////////title: app.i18n.t(req,'modify element'),
										////////elementName: 'element',
										////////element: element,
										////////msg: req.params.msg,
										////////dynForm: renderedForm,
										////////combo_jslModels: jslModels
									////////});	
								////////}
							//////});
						});
					} else {
						app.jsl.utils.errorPage(res, err, "GET: content form (modify): content not found on db");
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: content form (modify): failed query on db");
				}	
					
			});	
		}, false, true);
	});
	//POST: content form (modify)
	//il controllo sull'unicità del nome di ogni field viene fatto nel client
	app.post('/contents/:modelId/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnContentId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//carico i model di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function(modelName, fieldsToBePopulated){
			//prima trovo il mio content da modificare nel db
			app.jsl['jslmodel_'+req.params.modelId].findOne( { '_id': req.params.id } )
			.populate('jslModel')
			//QUI!!! popolo anche gli altri fields?
			.run(
				function(err, content) {
					if (!err)
					{
						//ho recuperato dal db con successo il mio content da modificare
						//popolo il mio content con quanto mi arriva dal form
						//app.jsl.utils.populateModel(content, req.body);
						app.jsl.utils.populateContentModel(app, req, res, content, req.body, function(){
							//salvo il content modificato
							content.save(function(err) {
								////////ora devo salvare i suoi contenuti dinamici
								////////prima carico da db i contenuti del mio element attualmente nel db
								////////getContentInstance(app, element.jslModel, element._id, function( contentInstance ) {
								//////getContentInstance(app, element, function( contentInstance ) {
									//////if ( contentInstance ) {
										////////aggiungo a mano l'id del mio element
										////////questa non serve perchè la mia istanza arriva dal db ed ha già l'id impostato: contentInstance.element = element.id;
										////////quindi popolo l'istanza dei contenuti con quanto mi arriva dal form
										////////(dalla parte dynForm del form mi arrivano i contenuti per qui)
										////////ok funziona ma non gestisce gli ObjectId: app.jsl.utils.populateModel(contentInstance, req.body);
										//////app.jsl.utils.populateContentModel(app, req, res, contentInstance, req.body, function(){
											////////quindi salvo anche i contenuti
											//////contentInstance.save(function (err) {
												//////if (!err) {
													////////console.log('tutto ok, avrei salvato il contenuto dinamico');
													//e rimando nel form
													res.redirect('/contents/'+req.params.modelId+'/edit/'+content._id+'/success');
												//////} else {
													//////console.log('elements/edit/:id - errore salvando il contenuto dinamico');
													//////app.jsl.utils.errorPage(res, err, "POST: element form (modify):error saving dynamic content of an element");
												//////}
											//////});
										//////});
									//////} else {
										//////console.log('elements/edit/:id - getContentInstance returnet false');
										//////app.jsl.utils.errorPage(res, err, "POST: element form (modify): getContentInstance returnet false");
									//////}
								//////});
							});
						});
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "POST: content form (modify): content not found on db");
					}
				}
			);
		}, false, true);
	});
	
	//GET: content delete
	app.get('/contents/:modelId/delete/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnContentId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//carico i model di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function(modelName, fieldsToBePopulated){
			////////prima leggo l'content da cancellare dal db, perchè mi deve fornire l'id del model
			//////app.jsl['jslmodel_'+req.params.modelId].findOne(
				//////{ '_id': req.params.id },
				//////function(err, content) {
					//////if ( err ) {
						//////app.jsl.utils.errorPage(res, err, 'GET: content delete: failed getting content from db');
					//////} else {
						//trovato il mio content (con l'id del suo model)
						//posso eliminare dal db l'istanza del content
						//////deleteContentInstance(app, element.jslModel, element._id, function (result) {
							//////if ( result ) {
								//posso cancellare l'content
								app.jsl['jslmodel_'+req.params.modelId].remove(
									{ '_id': req.params.id },
									function(err, result) {
										if ( err ) {
											app.jsl.utils.errorPage(res, err, 'GET: content delete: failed deleting content');
										} else {
											//faccio un redirect sulla lista
											res.redirect('/contents/'+req.params.modelId);
										}
									}
								);
							//////} else {
								//////app.jsl.utils.errorPage(res, err, 'GET: element delete: deleteContentInstance returned false');
							//////}
						//////});
					//////}
				//////}
			//////);
		}, false, true);
	});

	
	
	
	
	
	//JSON ROUTES

	//POST: content render dynamic form
	//non ha controlli sui permessi, che vengono fatti invece solo in fase di save
	app.post('/json/contents/renderDynForm/:modelId', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		
		renderDynForm(app, req, res, req.params.modelId, function(renderedForm) { res.json(renderedForm); });
		
		
		
		//console.log(req.params);
		//appendDiv(req, req.params.page, req.params.div, req.params.ord, function(){ res.json(); });
	});	
	


		
	
}
exports.defineRoutes = defineRoutes;


//ritorna un'istanza nuova (quindi non popolata) di un model di mongoose creato dinamicamente
//non ha controlli di sicurezza, va usata solo internamente
function newContentInstance(app, modelId, next) {
	app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
		next( new app.jsl['jslmodel_'+moduleId]() );
	});
}
exports.newContentInstance = newContentInstance;

//ritorna un'istanza salvata nel db di un model di mongoose creato dinamicamente
//non ha controlli di sicurezza, va usata solo internamente
//si aspetta che element abbia il field jslModel popolato
function getContentInstance(app, element, next) {
	//console.log('###### getContentInstance()');
	//console.log('con element:');
	//console.log(element);
	//some vars
	var elementId = element._id;
	var modelId = element.jslModel._id;
	var schema = JSON.parse(element.jslModel.jslSchema);
	//ora dallo schema devo trovare i fields di tipo ObjectId perchè vanno popolati quando si legge il content dal db
	var referencedModelsToBeLoaded = [];
	var fieldsToBePopulated = [];
	//console.log("cerco gli ObjectId in questo schema:");
	//console.log(schema);
	for ( field in schema ) {
		if ( app.jsl.utils.is_array( schema[field] ) ) {
			var fieldObj = schema[field][0];
		} else {
			var fieldObj = schema[field];
		}
		//console.log(field);
		//console.log(fieldObj.type);
		if ( fieldObj.type == 'ObjectId' ) {
			var modelId = fieldObj.ref.substr(9);
			//tutti i campi di tipo ObjectId vanno popolati
			fieldsToBePopulated.push(field);
			//aggiungo il model id al mio array solo se non c'è già dentro
			if ( !app.jsl.utils.in_array( referencedModelsToBeLoaded, modelId ) ) {
				referencedModelsToBeLoaded.push(modelId);
			}
		}
	}
	//console.log("trovati models da caricare:");
	//console.log(referencedModelsToBeLoaded);
	//console.log("trovati fields da popolare:");
	//console.log(fieldsToBePopulated);
	//devo chiamare loadMongoose su ciascuno dei modelli richiamati dagli ObjectId!!!
	app.jsl.jslModelController.loadMongooseModelsFromId(app, referencedModelsToBeLoaded, function(){
		//carico anche il model del mio contenuto principale, oltre a quelli relazionati
		app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
			//caricati tutti i model mongoose, posso farci sopra una query
			//console.log('### eseguo questa query: app.jsl.'+modelName+'.findOne( { "element": '+elementId+' } ).populate("'+referencedModelsToBeLoaded+'")');
			app.jsl['jslmodel_'+req.session.filterByModel].findOne( { 'element': elementId } )
			.populate(fieldsToBePopulated[0]) //QUI!!! farlo andare su tutti gli elementi dell'array
			.run(function(err, content) {
				//console.log(element);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un content col mio id
					if ( content )
					{
						//console.log('getContentInstance(): letto e popolato content dal db: ');
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
	});
}
exports.getContentInstance = getContentInstance;

//elimina un'istanza salvata nel db di un model di mongoose creato dinamicamente
//non ha controlli di permessi, va usata solo internamente
function deleteContentInstance(app, modelId, elementId, next) {
	app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function(modelName) {
		//caricato il model mongoose, posso cancellare l'istanza del content
		app.jsl['jslmodel_'+req.session.filterByModel].remove( { 'element': elementId }, function(err, result) {
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



//questo renderizza il form partendo dallo schema del model (anche se l'algoritmo ricorsivo vero è proprio è renderDynFormRecurse())
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
				renderDynFormRecurse(app,req,res,schema,content,modelId,next);
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
					renderDynFormRecurse(app,req,res,schema,content,modelId,next);
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
function renderDynFormRecurse(app, req, res, schema,content,modelId,next) {
	//console.log('renderDynFormRecurse(): mi passano lo schema:');
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
			//non devo mai renderizzare i field di sistema, quelli vengono trattati a parte
			if ( field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) {
				//skippo
			} else {
				
				//devo distinguere se si tratta di un field array o singolo
				if ( app.jsl.utils.is_array(schema[field]) ) {
					schema[field] = schema[field].pop();
					schema[field].type_cardinality = 'multiple';
				} else {
					schema[field].type_cardinality = 'single';
				}
				//console.log('considero il field: '+field+' che vale:');
				//console.log(schema[field]);
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
						cardinality: schema[field].type_cardinality,
						element: content,
						type_model: (schema[field].ref) ? schema[field].ref.substr(9) : '',
						encURI: function(content){ return encodeURIComponent(content) },
						decURI: function(content){ return decodeURIComponent(content) },
						esc: function(content){ return escape(content) },
						uesc: function(content){ return unescape(content) },
						__i: app.i18n.__,
						trunc: app.jsl.utils.trunc,
						app: app,
						req: req,
						res: res
					});
				} else {
					//popolo il template con un content vuoto
					dynFormRendered += dynFormCompiled({
						field: field,
						icon: icon,
						counter: counter,
						description: schema[field].description,
						required: schema[field].required,
						cardinality: schema[field].type_cardinality,
						element: {},
						type_model: (schema[field].ref) ? schema[field].ref.substr(9) : '',
						encURI: function(content){ return encodeURIComponent(content) },
						decURI: function(content){ return decodeURIComponent(content) },
						esc: function(content){ return escape(content) },
						uesc: function(content){ return unescape(content) },
						__i: app.i18n.__,
						trunc: app.jsl.utils.trunc,
						app: app,
						req: req,
						res: res
					});
				}
				counter++;
			}
		}
	}
	next( dynFormRendered );
}


/*
dato uno schema e il suo contenuto, renderizza un template di view (list o detail)
*/
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
		if ( content[field] !== false && ( content[field] === null || content[field] === undefined || content[field] == '' ) ) continue;
		//skippo i field interni di jslardo
		if ( field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) continue;
		//se sono il list mode, limito il numero di fields ritornati
		if ( type == 'list' && counter >= listFieldsNum ) break;
		//console.log(schema[field]);
		//distinguo a seconda della cardinality del mio field
		if ( app.jsl.utils.is_array( schema[field] ) ) {
			var fieldObj = schema[field][0];
		} else {
			var fieldObj = schema[field];
		}
		
		
		//questa potrebbe supportare un caching
		if ( type == 'detail') {
			var templateFilename = 'views/includes/dynDetail/'+fieldObj.type+'.jade';
		} else if ( type == 'list') {
			var templateFilename = 'views/includes/dynList/'+fieldObj.type+'.jade';
		}
		var dynView = fs.readFileSync(templateFilename, 'utf8');
		//compilo il template
		var dynViewCompiled = jade.compile(dynView.toString('utf8'), {filename: templateFilename});
		var icon = '/images/pov/'+app.jsl.utils.datatypeByName(fieldObj.type).icon+'_40x30.png';
		//popolo il template
		dynViewRendered += dynViewCompiled({
			field: field,
			description: fieldObj.description,
			icon: icon,
			content: content,
			encURI: function(content){ return encodeURIComponent(content) },
			decURI: function(content){ return decodeURIComponent(content) },
			esc: function(content){ return escape(content) },
			uesc: function(content){ return unescape(content) },
			__i: app.i18n.__,
			trunc: app.jsl.utils.trunc
		});
		counter++;
	}
	next(dynViewRendered);
}

/*
questo metodo popola ogni content dell'array contents con anche il tpl renderizzato del suo content.
contents, essendo passato per reference, viene modificato, senza bisogno di ritornarlo
*/
function renderDynViewList(app, req, res, contents, next ) {
	//console.log('###### renderDynViewList():');
	//creo un array con i soli id dei miei contents
	var contentsId = [];
	for ( var i=0; i<contents.length; i++) {
		contentsId.push(contents[i]._id);
	}
	//console.log(contentsId);
	//ciclo su ogni content, e gli appendo il relativo content renderizzato
	recurse();
	function recurse() {
		if ( contentsId.length > 0 ) {
			var contentId = contentsId.pop();
			//leggo dall'array contents quello col mio id
			for ( var i=0; i<contents.length; i++) {
				if ( contents[i]._id == contentId ) {
					var content = contents[i];
					break;
				}
			}
			//ora che ho il content, renderizzo il tpl per lui e lo appendo al mio content
			renderDynView(app, req, res, 'list', JSON.parse(content.jslModel.jslSchema), content, function(renderedView) {
				content.dynView = renderedView;
				recurse();
			});
		} else {
			//finito
			next();
		}
	}
}



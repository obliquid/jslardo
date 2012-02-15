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
			getRecords(app,req,res,function(contents,total){
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
			fieldsToBePopulated.push('jslModel');
			fieldsToBePopulated.push('author');
			app.jsl['jslmodel_'+req.params.modelId]
			.findOne( conditions )
			.populateMulti(fieldsToBePopulated)
			.run(function(err, content) {
				//console.log(content);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un content col mio id e status: share,
					//in questo caso ritorna uno content null, quindi devo controllare se esiste lo content, altrimenti rimando in home
					if ( content )
					{
						//pre-renderizzo il blocco di detail relativo al contanuto dinamico
						renderDynView(app, req, res, 'detail', JSON.parse(content.jslModel.jslSchema), content, function(renderedView) {
							//ora che ho anche i contents del mio content, posso renderizzare il detail
							res.render('contents/detail', { 
								elementName: 'content',
								element: content,
								dynView: renderedView
							});
						});
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
	app.get('/contents/:modelId/edit/new/:callback?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
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
				if ( req.params.callback ) {
					var layout = 'layoutPopup';
					var callback = req.params.callback;
				} else {
					var layout = true;
					var callback = '';
				}
				//essendo definito il model, posso popolare il dynForm, che altrimenti resterebbe vuoto in attesa che venga scelto un model
				//pre-renderizzo il blocco di form relativo al contanuto dinamico
				renderDynForm(app, req, res, content.jslModel, function(renderedForm) {
					//renderizzo il form finale senza il dynForm
					res.render('contents/form', { 
						layout: layout,
						callback: callback,
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
					layout: layout,
					callback: callback,
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
	app.post('/contents/:modelId/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
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
		app.jsl.utils.populateContentModel(app, req, res, my_content, req.body, req.files, function(){
			//salvo il nuovo content
			my_content.save(function (err) {
				if (!err) 
				{
					//ho creato con successo il mio content nuovo
					//e rimando nel form
					if ( req.body.callback ) {
						res.redirect('/contents/'+req.params.modelId+'/edit/'+my_content.id+'/success/'+req.body.callback);
					} else {
						res.redirect('/contents/'+req.params.modelId+'/edit/'+my_content.id+'/success');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: content form: saving content");
				}
			});
		});
	});	
	
	//GET: content form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/contents/:modelId/edit/:id/:msg?/:callback?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnContentId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//carico i model di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function(modelName, fieldsToBePopulated){
			//mi hanno passato l'id obbligatoriamente
			//leggo il mio content dal db, e assegno il result al tpl
			fieldsToBePopulated.push('jslModel');
			app.jsl['jslmodel_'+req.params.modelId].findOne( { '_id': req.params.id } )
			.populateMulti(fieldsToBePopulated)
			.run( function(err, content) {
				if (!err)
				{
					if ( content ) {
						//(devo ovviamente popolare il combo con i miei models)
						app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
							//pre-renderizzo il blocco di form relativo al contanuto dinamico
							renderDynForm(app, req, res, req.params.modelId, function(renderedForm) {
								//ora che ho anche il blocco di form dinamico, posso renderizzare il form finale
								if ( req.params.callback ) {
									var callback = req.params.callback;
									var layout = 'layoutPopup';
								} else {
									var callback = false;
									var layout = true;
								}
								res.render('contents/form', {
									layout: layout,
									title: app.i18n.t(req,'modify content'),
									elementName: 'content',
									element: content,
									msg: req.params.msg,
									dynForm: renderedForm,
									combo_jslModels: jslModels,
									callback: callback
								});	
							}, jslModels, content);
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
		/*
		console.log('req.body:');
		console.log(req.body);
		console.log('req.files:');
		console.log(req.files);
		*/
		
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
						app.jsl.utils.populateContentModel(app, req, res, content, req.body, req.files, function(){
							//console.log('content');
							//console.log(content);
							//salvo il content modoficato
							content.save(function(err) {
								if (err) {
									app.jsl.utils.errorPage(res, err, "POST: content form (modify): error saving content");
								} else {
									//siccome quella merda di mongo non mi resetta i campi dbref che gli arrivano vuoti dal form,
									//devo unsettarli a mano
									app.jsl.jslModelController.unsetEmptyFields(app,req,res,content,req.body,function(){
										//e rimando nel form
										if ( req.body.callback ) {
											res.redirect('/contents/'+req.params.modelId+'/edit/'+content._id+'/success/'+req.body.callback);
										} else {
											res.redirect('/contents/'+req.params.modelId+'/edit/'+content._id+'/success');
										}
										
									});
								}
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
		//carico il model di mongoose
		app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function(modelName, fieldsToBePopulated){
			//se il mio content è referenziato da qualche altro content, devo droppare il field dal content referenziante
			//prima devo cercare fra tutti i models quelli che hanno uno schema che refenzia il mio model
			var re = new RegExp('.*jslmodel_'+req.params.modelId+'.*');
			app.jsl.jslModel.find({'jslSchema': re})
			.run(function(err, models){
				if ( err ) {
					app.jsl.utils.errorPage(res, err, 'GET: content delete: failed finding models with a schema that references me');
				} else {
					//console.log('trovati models che mi referenziano:');
					//console.log(models);
					//ciclo su ogni model
					recurse();
					function recurse() {
						if ( models.length > 0 ) {
							var model = models.pop();
							//console.log('######## considero il model:');
							//console.log(model);
							var schema = JSON.parse(model.jslSchema);
							//ciclo sui campi dello schema, e tutti quelli che trovo che referenziano il mio model, li updato
							var toBeUpdatedFields = [];
							for ( var field in schema ) {
								//skippo i field interni di jslardo
								if ( field != 'jslModel' && field != 'author' && field != 'created' && field != 'status' ) {
									//console.log('###### considero il field:');
									//console.log(field);
									//distinguo a seconda che sia array o singolo
									if ( app.jsl.utils.is_array( schema[field] ) ) {
										var fieldObj = schema[field][0];
									}
									else {
										var fieldObj = schema[field];
									}
									//console.log('con schema[field]:');
									//console.log(fieldObj);
									if ( fieldObj.type == 'ObjectId' && fieldObj.ref == 'jslmodel_'+req.params.modelId ) {
										//console.log('============ !!! beccato il mio field, questo lo devo updatare');
										toBeUpdatedFields.push(field);
									}
								}
							}
							//console.log('devo updatare questi fields:');
							//console.log(toBeUpdatedFields);
							//ciclo su ogni field da updatare e ci faccio sopra la query di update
							nestedRecurse();
							function nestedRecurse() {
								if ( toBeUpdatedFields.length > 0 ) {
									var field = toBeUpdatedFields.pop();
									//console.log('###### considero il field da updatare:');
									//console.log(field);
									//carico il modello mongoose
									//console.log('carico il modello mongoose per model.id = '+model.id);
									app.jsl.jslModelController.loadMongooseModelFromId(app, model.id, function(modelName){
										//trovo i contents da updatare (cioè quelli che referenziano il mio content da cancellare)
										//console.log('trovo i contents da updatare (cioè quelli che referenziano il mio content da cancellare)');
										//definisco le conditions della query
										var conditions = {};
										//in teoria questa condition vale sia per i field array che per quelli singoli, per come funziona mongoose
										conditions[field] = req.params.id; //voglio che il mio field, se è un array, contenga, se è un singolo, sia uguale all'id del content che devo cancellare
										app.jsl[modelName].find(
											conditions,
											function(err, contents) {
												if ( err ) {
													app.jsl.utils.errorPage(res, err, 'GET: content delete: failed getting related contents');
												} else {
													//console.log('beccati questi contents da updatare in quanto referenziano il mio content da cancellare');
													//console.log(contents);
													nestedNestedRecurse();
													function nestedNestedRecurse() {
														if ( contents.length > 0 ) {
															var content = contents.pop();
															//console.log('#### sto per updatare il content: ');
															//console.log(content);
															//aggiorno il contenuto del content prima di risalvarlo
															if ( app.jsl.utils.is_array( schema[field] ) ) {
																//console.log('il field è un array, quindi devo togliergli un elemento, e poi risalvarlo');
																app.jsl.utils.splice_by_element(content[field],req.params.id);
																//console.log('ecco il content modificato pronto per essere updatato nel db:');
																//console.log(content);
																content.save(function(err) {
																	if (err) {
																		app.jsl.utils.errorPage(res, err, "GET: content delete: error saving referencing content");
																	} else {
																		//console.log('#### content modificato salvato!! nestedNestedRecurse()!');
																		nestedNestedRecurse();
																	}
																});
															}
															else {
																//console.log('il field è un singolo, quindi devo fare una query di unset');
																//non va: delete content[field];
																//memmeno: content[field] = undefined;
																var unset = {};//è l'oggetto di sort
																unset[field] = 1;
																app.jsl[modelName].update({'_id':content.id},{ $unset : unset }, false, true  )
																.run(function(err) {
																	if (err) {
																		app.jsl.utils.errorPage(res, err, "GET: content delete: error unsetting referencing content");
																	} else {
																		//console.log('#### content unsettato!! nestedNestedRecurse()!');
																		nestedNestedRecurse();
																	}
																});
															}
														} else {
															//console.log('#### finito di updatare i content per il field: '+field);
															//console.log('###### nestedRecurse();!');
															nestedRecurse();
														}
													}
												}
											}
										);									
									});
								} else {
									//console.log('###### finito di updatare tutti i fields di questo model');
									//console.log('######## recurse()!');
									recurse();
								}
							}
						} else {
							//finito di updatare i models esterni
							//posso cancellare il content
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
						}
					}
				}
			});
		});
	});

	
	
	
	
	
	//JSON ROUTES

	//POST: content render dynamic form
	app.post('/json/contents/renderDynForm/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		
		renderDynForm(app, req, res, req.params.id, function(renderedForm) { res.json(renderedForm); });
		
		
		
		//console.log(req.params);
		//appendDiv(req, req.params.page, req.params.div, req.params.ord, function(){ res.json(); });
	});	
	

	//POST: content render referenced contents
	//come id vuole il modelId, per fare i controlli sui permessi
	app.post('/json/contents/renderDynViewRefs/:id/:contentsIds/:type/:field', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//ciclo async su ogni id, e per ciascuno leggo il suo content, e poi renderizzo (sync) il suo pezzetto di template
		var contentsIds = req.params.contentsIds.split(',');
		var modelId = req.params.id;
		var type = req.params.type;
		var field = req.params.field;
		var renderedView = '';
		recurse();
		function recurse() {
			if ( contentsIds.length > 0 ) {
				var contentId = contentsIds.shift();
				//se sono superadmin vedo anche i non share
				var conditions = ( req.session.user_id == 'superadmin' ) 
				? 
				{ '_id': contentId } 
				: 
				{ $or: [
					{ '_id': contentId,  'status': 'share' },
					{ '_id': contentId,  'author': req.session.user_id }
				]};
				
				//carico il model di mongoose
				app.jsl.jslModelController.loadMongooseModelFromId(app, modelId, function( modelName, fieldsToBePopulated ){
					//fieldsToBePopulated.push('jslModel');
					//fieldsToBePopulated.push('author');
					app.jsl['jslmodel_'+modelId]
					.findOne( conditions )
					//.populateMulti(fieldsToBePopulated)
					.run(function(err, content) {
						//console.log(content);
						if ( !err ) {
							//la query può andare a buon fine anche se non esiste un content col mio id e status: share,
							//in questo caso ritorna uno content null, quindi devo controllare se esiste lo content, altrimenti rimando in home
							if ( content ) {
								//ho trovato il content del mio element. posso renderizzarne l'output
								renderedView += renderDynViewRefs(app,req,res,type,content,field);
								recurse();
							} else {
								app.jsl.utils.errorPage(res, err, 'POST: content render referenced contents: no content found in db');
							}
						} else {
							app.jsl.utils.errorPage(res, err, 'POST: content render referenced contents: failed getting content from db');
						}
					});
				});
			} else {
				//finito
				res.json(renderedView);
			}
		}
	});	
	
}
exports.defineRoutes = defineRoutes;

/* query di fetch dei dati usate dalle routes */

/* list */
function getRecords(app,req,res,next) {
	//leggo i content dal db, e assegno il result al tpl
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
	//console.log('conditions:');
	//console.log(conditions);
	//carico i mongoose models richiesti alla query
	//console.log('/contents/:modelId/:page?/:callback? -> chiamo loadMongooseModelFromId con modelId = '+req.params.modelId);
	app.jsl.jslModelController.loadMongooseModelFromId(app, req.params.modelId, function( modelName, fieldsToBePopulated ){
		//console.log('/contents/:modelId/:page?/:callback? -> finito di chiamare loadMongooseModelFromId con modelId = '+req.params.modelId);
		//console.log('fieldsToBePopulated:');
		//console.log(fieldsToBePopulated);
		//console.log('dove la metto qui dentro?');
		//console.log(app.mongoose.Query);
		//per via della paginazione, ogni query di list va preceduta da una query di count
		app.jsl['jslmodel_'+req.params.modelId].count(
			conditions,
			function(err, total) {
				if ( !err )
				{
					//console.log('count succeded');
					fieldsToBePopulated.push('jslModel');
					//procedo col find paginato
					app.jsl['jslmodel_'+req.params.modelId].find(
						conditions,
						[], { 
							skip: req.session.skip, 
							limit: req.session.limit 
						})
					//.populate('jslModel')
					.populateMulti(fieldsToBePopulated)
					//non va?? .sort('jslModel.name', -1)
					.sort('_id', -1)
					.run( function(err, contents) {
						if (!err) {
							//console.log('find succeded:');
							//console.log(contents);
							//per tutti i content renderizzo il tpl e glielo appendo. sarà poi il tpl list principale,
							//in un ciclo, a visualizzare i singoli tpl generati dinamicamente
							renderDynViewList(app, req, res, contents, function(){
								//adesso dentro a contents, per ciascun content c'è anche una property 'dynView' con il pezzo di tpl popolato con i propri content
								next(contents,total);
							});
						} else {
							app.jsl.utils.errorPage(res, err, "GET: content list: failed query find on db: "+err);
						}
					});
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: content list: failed query count on db");
				}	
			}
		);
	}, false, true); //il 'true' significa che voglio caricare anche i models relazionati
}
exports.getRecords = getRecords;







/* non più usate
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
	for ( var field in schema ) {
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
*/


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
	for ( var field in schema) {
		if ( schema.hasOwnProperty(field) && typeof schema[field] !== 'function') {
			//non devo mai renderizzare i field di sistema, quelli vengono trattati a parte
			if ( field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) {
				//skippo
			} else {
				/* vecchia versione, ok ma non popolava refContents
				//devo distinguere se si tratta di un field array o singolo
				if ( app.jsl.utils.is_array(schema[field]) ) {
					schema[field] = schema[field].pop();
					schema[field].type_cardinality = 'multiple';
				} else {
					schema[field].type_cardinality = 'single';
				}
				//console.log('considero il field: '+field+' che vale:');
				//console.log(schema[field]);
				*/
				var isArray = false;
				if ( app.jsl.utils.is_array( schema[field] ) ) {
					var fieldObj = schema[field][0];
					fieldObj.type_cardinality = 'multiple';
					isArray = true;
				} else {
					var fieldObj = schema[field];
					fieldObj.type_cardinality = 'single';
				}
				//solo nel caso del datatype ObjectId, prima di passare il content al tpl,
				//renderizzo un blocco html con i vari ref contents, e poi lo appendo al content
				//da passare al tpl
				if ( fieldObj.type == 'ObjectId' ) {
					//se non ho content per questo field, skippo
					if (
						!(
							!app.jsl.utils.is_array( content[field] ) && ( content[field] === null || content[field] === undefined || content[field] == '' )
							||
							app.jsl.utils.is_array( content[field] ) && content[field].length == 0
						)
					)
					{
						var refOutput = '';
						var refIds = '';
						if ( isArray ) {
							for ( var i=0; i < content[field].length; i++) {
								refOutput += renderDynViewRefs(app,req,res,'form',content[field][i],field);
								if ( i == 0 ) {
									refIds = content[field][i]._id;
								} else {
									refIds += ',' + content[field][i]._id;
								}
								
							}
						} else {
							refOutput = renderDynViewRefs(app,req,res,'form',content[field],field);
							refIds = content[field]._id;
						}
						content[field]['refContents'] = refOutput;
						content[field]['refIds'] = refIds;
					}
				}
				//solo nel caso dei Date devo riformattare la data in modo gradito al datepicker del form
				//non sovrascrivo il field originario perchè non riesco in nessun modo, sono costretto
				//a creare un field parallelo con la data riformattata per il datepicker
				if ( fieldObj.type == 'Date' ) {
					//content[field] = app.jsl.utils.mongo_to_datepicker(content[field]);
					//console.log('prima');
					//console.log(content);
					//console.log(content[field+'_for_datepicker']);
					content[field+'_for_datepicker'] =  app.jsl.utils.mongo_to_datepicker(content[field]);
					//console.log('dopo');
					//console.log(content);
					//console.log(content[field+'_for_datepicker']);
				}
				
				//apro il relativo template
				//questa potrebbe supportare un caching
				var templateFilename = 'views/includes/dynForm/'+fieldObj.type+'.jade';
				var dynForm = fs.readFileSync(templateFilename, 'utf8');
				//compilo il template
				//no so perchè ma il compile, oltre al contenuto del template, vuole anche il file altrimenti non vanno gli include
				//forse perchè dal path assoluto del file capisce il path relativo per gli includes
				var dynFormCompiled = jade.compile(dynForm.toString('utf8'), {filename: templateFilename});
				var icon = '/images/pov/'+app.jsl.datatypeByName(fieldObj.type).icon+'_40x30.png';
				//se mi hanno passato un content popolo il template del form anche con quello, altrimenti popolo solo con il nome del field
				if ( !content ) content = {};
				//appendo sempre al content il name_full del field
				content.fieldNameFull = fieldObj.name_full;
				
				//popolo il template
				dynFormRendered += dynFormCompiled({
					field: field,
					icon: icon,
					counter: counter,
					description: fieldObj.description,
					required: app.jsl.utils.bool_parse(fieldObj.required),
					cardinality: fieldObj.type_cardinality,
					content: content,
					type_model: (fieldObj.ref) ? fieldObj.ref.substr(9) : '',
					encURI: function(content){ return encodeURIComponent(content) },
					decURI: function(content){ return decodeURIComponent(content) },
					esc: function(content){ return escape(content) },
					uesc: function(content){ return unescape(content) },
					__i: app.i18n.__,
					trunc: app.jsl.utils.trunc,
					getImg: app.jsl.utils.getImg,
					app: app,
					req: req,
					res: res
				});
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
	var output = '';
	//number of fields to be visualized for list type
	var listFieldsNum = 3; 
	//ciclo sui field del schema
	var counter = 0;
	for ( var field in schema ) {
		
		//console.log(field);
		//console.log(schema[field]);
		//console.log(content[field]);
		
		//se non ho content per questo field, skippo
		if ( !app.jsl.utils.is_array( content[field] ) && content[field] !== false && ( content[field] === null || content[field] === undefined || content[field] == '' ) ) {
			//console.log('butto!');
			continue;
		}
		if ( app.jsl.utils.is_array( content[field] ) && content[field].length == 0 ) continue;
		
		//skippo i field interni di jslardo
		if ( field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) continue;
		//se sono in list mode, limito il numero di fields ritornati
		if ( type == 'list' && counter >= listFieldsNum ) break;
		//console.log(schema[field]);
		//distinguo a seconda della cardinality del mio field
		var isArray = false;
		if ( app.jsl.utils.is_array( schema[field] ) ) {
			var fieldObj = schema[field][0];
			//console.log('lo schema field è un array');
			isArray = true;
		} else {
			var fieldObj = schema[field];
		}
		//solo nel caso del datatype ObjectId, prima di passare il content al tpl,
		//renderizzo un blocco html con i vari ref contents, e poi lo appendo al content
		//da passare al tpl
		if ( fieldObj.type == 'ObjectId' ) {
			var refOutput = '';
			/*
			console.log('ricorro sul campo '+field);
			console.log('fieldObj:');
			console.log(fieldObj);
			console.log('content[field]:');
			console.log(content[field]);
			console.log('typeof content[field]:');
			console.log(typeof content[field]);
			if ( app.jsl.utils.is_array( content[field] ) ) {
				console.log(field+' è indubbiamente un array, di lunghezza:');
				console.log(content[field].length);
			}
			*/
			
			//non mi serve: var refModelId = fieldObj.ref.substr(9);
			if ( isArray ) {
				for ( var i=0; i < content[field].length; i++) {
					refOutput += renderDynViewRefs(app,req,res,type,content[field][i],field);
				}
			} else {
				//non voglio fare una query per avere lo schema,
				//quindi butto fuori i field che ho nel content senza sapere
				//il datatype.
				refOutput += renderDynViewRefs(app,req,res,type,content[field],field);
			}
			content[field]['refContents'] = refOutput;
		}
		//appendo sempre al content il name_full del field
		content.fieldNameFull = fieldObj.name_full;
		//questa potrebbe supportare un caching
		if ( type == 'detail') {
			var templateFilename = 'views/includes/dynDetail/'+fieldObj.type+'.jade';
		} else if ( type == 'list') {
			var templateFilename = 'views/includes/dynList/'+fieldObj.type+'.jade';
		}
		var dynView = fs.readFileSync(templateFilename, 'utf8');
		//compilo il template
		var dynViewCompiled = jade.compile(dynView.toString('utf8'), {filename: templateFilename});
		var icon = '/images/pov/'+app.jsl.datatypeByName(fieldObj.type).icon+'_40x30.png';
		//popolo il template
		output += dynViewCompiled({
			field: field,
			description: fieldObj.description,
			icon: icon,
			content: content,
			encURI: function(content){ return encodeURIComponent(content) },
			decURI: function(content){ return decodeURIComponent(content) },
			esc: function(content){ return escape(content) },
			uesc: function(content){ return unescape(content) },
			__i: app.i18n.__,
			trunc: app.jsl.utils.trunc,
			getImg: app.jsl.utils.getImg,
			emailObfuscate: app.jsl.utils.emailObfuscate,
			app: app,
			req: req,
			res: res
		});
		counter++;
	}
	next(output);
}

/*
per i content referenziati visualizzo sempre solo il primo field utile non vuoto
*/
function renderDynViewRefs(app,req,res,type,content,parentField) {
	//memorizzo il model e l'id che mi servono per generare il link al detail del mio content referenziato
	//var jade = require('jade');
	//var fs = require('fs');	
	var contentId = content.id;
	var modelId = content.jslModel;
	var output = '';
	//console.log('###### renderDynViewRefs(): considero il content.schema.paths:');
	//console.log(content.schema.paths);
	var found = false;
	for ( var field in content.schema.paths ) {
		if ( found ) break; //butto fuori solo il primo
		//console.log('### e dentro al content considero il field: '+field);
		var fieldType = content.schema.paths[field].instance;
		if (fieldType == 'ObjectID') fieldType = 'ObjectId'; //piccole differenze...
		//se è del prototype, skippo
		//no: if ( !content.hasOwnProperty(field)) continue;
		//se non ho content per questo field, skippo
		if ( content[field] !== false && ( content[field] === null || content[field] === undefined || content[field] == '' ) ) continue;
		//skippo i field interni di jslardo
		if ( field == '_id' || field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) continue;

		//output del field
		if ( type == 'detail') {
			output += '<a href="/contents/'+modelId+'/'+contentId+'" class="refLink" title="'+app.i18n.t(req,'detail')+'">'+content[field]+'</a>';
		} else if ( type == 'list') {
			output += content[field]+' ';
		} else if ( type == 'form') {
			output += '<li id="id_'+contentId+'" class="innerCont size2">';
			output += '<span>'+content[field]+'</span>';
			output += '<a onclick="dropContent_'+parentField+'(this)" class="adminButton unlinkButton" title="'+app.i18n.t(req,'deselect')+'"></a>';
			output += '<a onclick="modifyContent_'+parentField+'(this)" class="adminButton modifyButton" title="'+app.i18n.t(req,'modify')+'"></a>';
			output += '</li>';
		}

		found = true;
		
		/* questa funziona, ricorre, ma serve qualcosa di più custom nell'output
		//questa potrebbe supportare un caching
		if ( type == 'detail') {
			var templateFilename = 'views/includes/dynDetail/'+fieldType+'.jade';
		} else if ( type == 'list') {
			var templateFilename = 'views/includes/dynList/'+fieldType+'.jade';
		}
		var dynView = fs.readFileSync(templateFilename, 'utf8');
		//compilo il template
		var dynViewCompiled = jade.compile(dynView.toString('utf8'), {filename: templateFilename});
		var icon = '/images/pov/'+app.jsl.datatypeByName(fieldType).icon+'_40x30.png';
		//popolo il template
		output += dynViewCompiled({
			field: field,
			description: '',
			icon: icon,
			content: content,
			encURI: function(content){ return encodeURIComponent(content) },
			decURI: function(content){ return decodeURIComponent(content) },
			esc: function(content){ return escape(content) },
			uesc: function(content){ return unescape(content) },
			__i: app.i18n.__,
			trunc: app.jsl.utils.trunc
		});
		*/
		
		
	}
	return output;
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



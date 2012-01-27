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
jslModel
*/

function defineRoutes(app) {

	//GET: jslModel list
	app.get('/jslModels/:page?', app.jsl.perm.readStrucPermDefault, app.jsl.pag.paginationInit, function(req, res, next){
		app.jsl.routes.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli jslModel dal db, e assegno il result al tpl
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
			app.jsl.jslModel.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.jslModel.find(
							conditions,
							[], 
							{ 
								sort: ['name', 'ascending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, jslModels) {
								res.render('jslModels/list', { 
									elementName: 'jslModel',
									elements: jslModels,
									pagination: app.jsl.pag.paginationDo(req, total, '/jslModels/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.utils.errorPage(res, err, "GET: jslModel list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: jslModel detail 
	app.get('/jslModels/:id', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//leggo il mio jslModel dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non share
		var conditions = ( req.session.user_id == 'superadmin' ) 
		? 
		{ '_id': req.params.id } 
		: 
		{ $or: [
			{ '_id': req.params.id,  'status': 'share' },
			{ '_id': req.params.id,  'author': req.session.user_id }
		]};
		app.jsl.jslModel
			.findOne( conditions )
			.populate('author')
			.run(function(err, jslModel) {
				//console.log(jslModel);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un jslModel col mio id e status: share,
					//in questo caso ritorna uno jslModel null, quindi devo controllare se esiste lo jslModel, altrimenti rimando in home
					if ( jslModel )
					{
						res.render('jslModels/detail', { 
							elementName: 'jslModel',
							element: jslModel
						});	
					}
					else
					{
						//non esiste un jslModel share col mio id, quindi torno in home
						res.redirect('/');
					}
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: jslModel detail: query error");
				}
			});	
	});
	
	//GET: jslModel form (new)
	app.get('/jslModels/edit/new', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('jslModels/form', { 
			title: app.i18n.t(req,'create new model'),
			elementName: 'jslModel',
			element: ''
		});	
	});
	//POST: jslModel form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/jslModels/edit', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermCreate, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima verifico se il nome non è già stato usato (solo tra i miei contenuti, utenti diversi posso usare nomi usati da altri)
		app.jsl.jslModel.findOne(
			{ 'name': req.body.name, 'author': req.session.user_id },
			function(err, jslModel) {
				if ( jslModel ) 
				{
					//name già usato
					app.jsl.utils.errorPage(res, err, "already exists jslModel with name: "+req.body.name);
				}
				else
				{
					//name libero
					//creo nuovo jslModel
					var my_jslModel = new app.jsl.jslModel();
					//popolo il mio jslModel con quanto mi arriva dal form
					app.jsl.utils.populateModel(my_jslModel, req.body);
					//assegno l'author (non gestito dal form ma impostato automaticamente)
					my_jslModel.author = req.session.user_id;
					//inizializzo la data di creazione (che non è gestita dal form)
					my_jslModel.created = new Date();
					//dato che è un new, inizializzo uno schema vuoto
					my_jslModel.jslSchema = JSON.stringify(app.jsl.fieldController.addInternalFields({}));
					//non devo testare lo schema perchè è vuoto e sicuramente valido
					
					
					
					
					//salvo il nuovo jslModel
					my_jslModel.save(function (err) {
						if (!err) 
						{
							//rimando nel form
							res.redirect('/jslModels/edit/'+my_jslModel.id+'/success');
						}
						else
						{
							app.jsl.utils.errorPage(res, err, "POST: jslModel form: saving jslModel");
						}
					});
				}
			}
		);	
	});	
	
	//GET: jslModel form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	app.get('/jslModels/edit/:id/:msg?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio jslModel dal db, e assegno il result al tpl
		app.jsl.jslModel.findOne(
			{ '_id': req.params.id },
			function(err, jslModel) {
				if (!err)
				{
					res.render('jslModels/form', { 
						title: app.i18n.t(req,'modify model'),
						elementName: 'jslModel',
						element: jslModel,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: jslModel form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: jslModel form (modify)
	app.post('/jslModels/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//prima trovo il mio jslModel da modificare nel db
		app.jsl.jslModel.findOne(
			{ '_id': req.params.id },
			function(err, jslModel) {
				if (!err)
				{
					//ho trovato lo jslModel da modificare
					//prima di popolare lo jslModel controllo che, se l'jslModel sta cambiando name, non scelga un'name già usata
					//(in patica cerco uno jslModel che abbia la mia stessa name, ma un id differente: se lo trovo, vuol dire che la name è già stata usata)
					app.jsl.jslModel.findOne(
						{ 'name': req.body.name, 'author': req.session.user_id, '_id': { $ne : req.body.id } },
						function(err, jslModelSameName) {
							if ( jslModelSameName ) 
							{
								//name già usata
								app.jsl.utils.errorPage(res, err, "already exists jslModel with name: "+req.body.name);
							}
							else
							{
								//la nuova name è valida, posso procedere
								//prima di popolare, tengo una copia del vecchio schema, che mi servirà dopo
								//per droppare i field non più esistendi dal db
								var schemaOld = JSON.parse(jslModel.jslSchema);
								var schemaNew = JSON.parse(req.body.jslSchema);
								//popolo il mio jslModel con quanto mi arriva dal form
								app.jsl.utils.populateModel(jslModel, req.body);
								//prima di salvarlo, provo a caricare lo schema che mi passano. se qualcosa va
								//storto, non procedo nel save del modulo, e ritorno errore
								if ( testMongooseSchema(app, jslModel) ) {
									//lo schema è corretto
									/*
									prima di salvaro e ricaricare mongoose devo eliminare dal db corrente tutti i field che non esistono
									più (o che hanno un datatype diverso) nel nuovo schema salvato.
									questo va fatto prima di ricaricare mongoose, altrimenti mongoose
									non conoscerebbe più i field che voglio cancellare in quanto eliminati
									dallo schema.
									*/
									/*
									console.log('schemaOld:');
									console.log(schemaOld);
									console.log('schemaNew:');
									console.log(schemaNew);
									*/
									drop_db_fields(app, req.params.id, schemaOld, schemaNew, function(){
										//salvo lo jslModel modificato
										jslModel.save(function(err) {
											if ( !err ) {
												//salvato.
												//ho cambiato uno schema, se questo schema era già stato caricato in mongoose, va ricaricato per aggiornarlo con le modifiche
												//console.log('schema changed and saved. check if mongoose is already loaded');
												loadMongooseModelFromId(app, req.params.id, function(modelName){
													//console.log('in teoria ho ricaricato il mode: '+modelName);
													//rimando nel form
													res.redirect('/jslModels/edit/'+jslModel.id+'/success');
												}, true); //nota che come ultimo parametro forzo il reload del model
											} else {
												app.jsl.utils.errorPage(res, err, app.i18n.t(req,'POST: jslModel form (modify): failed saving model'));
											}
										});
									});
								} else {
									app.jsl.utils.errorPage(res, err, app.i18n.t(req,'POST: jslModel form (modify): invalid schema'));
								}
							}
						}
					);
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "POST: jslModel form (modify): jslModel not found on db");
				}
			}
		);
	});
	
	//GET: jslModel delete
	app.get('/jslModels/delete/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//carico sempre il model per poterlo usare
		loadMongooseModelFromId(app, req.params.id, function( modelName ){
			//prima del model, vanno cancellati anche tutti i suoi contents, ovvero va droppata la collection
			var contentInstance = new app.jsl[modelName]();
			contentInstance.collection.drop(function(err) {
				if (err) {
					app.jsl.utils.errorPage(res, err, 'GET: jslModel delete: failed dropping collection');
				} else {
					//console.log('droppata la collection');
								
					//se il mio model era usato come ref in qualche schema, devo droppare il field di quello schema
					
					//questi field li droppo anche se non ho i diritti sul model cui appartengono,
					//perchè ho i diritti sul model che sto cancellando che hanno precedenza in questo caso
					
					//devo fare una query che mi trova tutti i jslModel che abbiano uno schema (che è una stringa) che
					//contiene un field di tipo ObjectId con ref == al mio model:
					//semplifico cercando quelli con uno schema che contenga la stringa 'jslmodel_XXXXXXXXXXXXXXXXX'
					var re = new RegExp('.*jslmodel_'+req.params.id+'.*');
					app.jsl.jslModel.find({'jslSchema': re})
					.run(function(err, models){
						if ( err ) {
							app.jsl.utils.errorPage(res, err, 'GET: jslModel delete: failed finding models with a schema that references me');
						} else {
							//console.log('trovati models che referenziano il mio model:');
							//console.log(models);
							
							//ciclo su ciascuno per togliere il mio model dai loro schema
							recurse();
							function recurse() {
								if ( models.length > 0 ) {
									var model = models.pop();
									//console.log('## considero il model:');
									//console.log(model);
									var schema = JSON.parse(model.jslSchema);
									var schemaOld = JSON.parse(model.jslSchema); //tengo una copia
									//ciclo sui campi dello schema, e tutti quelli che trovo che referenziano il mio model, li elimino
									for ( var field in schema ) {
										//skippo i field interni di jslardo
										if ( field != 'jslModel' && field != 'author' && field != 'created' && field != 'status' ) {
											//console.log('# considero il field:');
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
											if ( fieldObj.type == 'ObjectId' && fieldObj.ref == 'jslmodel_'+req.params.id ) {
												//console.log('############# !!! beccato il mio field, questo lo devo droppare');
												delete schema[field];
											}
										}
									}
									//console.log('## ora devo risalvare il model affinchè si aggiorni lo schema');
									//console.log('questo è lo schema che savlerei:');
									//console.log(schema);
									model.jslSchema = JSON.stringify(schema);
									model.save(function(err){
										if (err) {
											app.jsl.utils.errorPage(res, err, 'GET: jslModel delete: failed saving model with updated schema');
										} else {
											//console.log('model aggiornato');
											//console.log('ora devo droppare i field che ho eliminato dal mio model relazionato');
											drop_db_fields(app, model.id, schemaOld, schema, function(){
												//console.log('droppati anche i fields.');
												//console.log('recurse!');
												recurse();
											});
										}
									});
								} else {
									//finito di updatare i models esterni
									//alla fine cancello l'jslModel
									app.jsl.jslModel.remove(
										{ '_id': req.params.id },
										function(err, jslModel) {
											if ( err ) {
												app.jsl.utils.errorPage(res, err, 'GET: jslModel delete: failed removing model from db');
											} else {
												//console.log('cancellato anche il modulo');
												//faccio un redirect sulla lista
												res.redirect('/jslModels');
											}
										}
									);
								}
							}
						}
					});
				}
			});
		});
	});
	
}
exports.defineRoutes = defineRoutes;

//questo metodo ritorna una lista di tutti i models visibili dall'utente corrente
//in base al fatto che sia loggato o meno, e che sia superadmin o meno
function getJslModels(req,res,closure)
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
			//voglio vedere tutti gli elementi
			//e sono loggato, quindi devo distinguere se sono superadmin(vedo tutti i jslModel) o no (vedo solo gli share o i miei)
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
	req.app.jsl.jslModel
		.find( conditions, [], { sort: ['name', 'ascending'] } )
		//.populate('author')
		.run(function(err, jslModels) {
			if ( !err )
			{
				//la query può andare a buon fine anche se non esiste un jslModel che rispetti le conditions
				//in questo caso ritorna uno jslModel null, quindi devo controllare se esiste lo jslModel
				if ( jslModels )
				{
					//ho trovato dei jslModels
					closure(jslModels);
				}
				else
				{
					//non ho trovato nessun jslModel, ritorno niente
					closure();
				}
			}
			else
			{
				req.app.jsl.utils.errorPage(res, err, "jslModel.getJslModels(): query error");
			}
		});	
}
exports.getJslModels = getJslModels;



/* questa riceve un json di uno schema, e ritorna uno schema mongoose valido */
function normalizeMongooseModel(app, jsonSchema) {
	//console.log('normalizeMongooseModel con jsonSchema:');
	//console.log(jsonSchema);
	/*
	ciclo sui field del mio schema, e sostituisco i datatype che sono dichiarati
	come stringhe con il loro relativo datatype javascript corretto
	*/
	for ( var field in jsonSchema ) {
		//distinguo tra field array e field singoli
		if ( app.jsl.utils.is_array( jsonSchema[field] ) ) {
			//field di tipo array
			//prendo il primo elemento, perchè è anche l'unico
			var fieldObj = jsonSchema[field][0];
			
		} else {
			//field a valore singolo
			var fieldObj = jsonSchema[field];
		}
		var fieldType = fieldObj.type;
		app.jsl.datatypeByName(fieldType)
		//if ( typeMappings[fieldType] ) {
		if ( app.jsl.datatypeByName(fieldType) ) {
			//fieldObj.type = typeMappings[fieldType];
			fieldObj.type = app.jsl.datatypeByName(fieldType).type;
			
			//correggo il valore required che è booleano ma mi arriva come stringa
			fieldObj.required = app.jsl.utils.bool_parse(fieldObj.required);
			//console.log('normalizeMongooseModel(): ho normalizzato il field: '+field);
			//console.log(fieldObj);
		} else {
			console.error("normalizeMongooseModel(): invalid type - "+fieldType+" - specified for field: ", field);
		}
	}
	
	
	//console.log(app.mongoose.modelSchemas.div.paths.children);
	//console.log(app.mongoose);
	
	
	/* non serve più
	//aggiungo sempre come campo anche l'id dell'element cui è legato questo modello dinamico
	jsonSchema.element = app.mongoose.Schema.ObjectId;
	*/
	//ritorno una nuova istanza del mio schema, pronta per essere caricata come model
	try {
		var normalizedModel = new app.mongoose.Schema(jsonSchema);
		return normalizedModel;
	} catch( err ) {
		console.log('normalizeMongooseModel(): ho fallito chiamando app.mongoose.Schema(jsonSchema): '+err);
		return false;
	}
}



/*
questa presuppone che lo schema arrivi come stringa, in una property di model.
NOTA: a parte in drop_db_fields() e pochissime eccezioni, questo metodo non
deve mai essere chiamato direttamente, al suo posto vanno sempre usati, ove
possibile, i 3 metodi pubblici: elements.getContentInstance|newContentInstance|deleteContentInstance
*/
function loadMongooseModel(app, model) {
	/*
	try {
		var jsonSchema = JSON.parse(model.jslSchema);
	} catch(err) {
		console.log('loadMongooseModel(): JSON.parse() error: ');
		console.log(err);
		return false;
	}
	*/
	if ( testMongooseSchema(app, model) ) {
		var jsonSchema = JSON.parse(model.jslSchema);
		var NewSchema = normalizeMongooseModel(app, jsonSchema);
		//definisco il nome del model di mongoose (che poi sarà anche il nome della collection)
		var modelName = 'jslmodel_'+model.id;
		/*
		console.log('loadMongooseModel(): PRIMA model.jslSchema=');
		console.log(model.jslSchema);
		console.log('loadMongooseModel(): PRIMA NewSchema=');
		console.log(NewSchema);
		if ( app.jsl[modelName] ) {
			console.log('loadMongooseModel(): PRIMA app.jsl[modelName].schema=');
			console.log(app.jsl[modelName].schema);
		}
		if ( app.mongoose ) {
			console.log('loadMongooseModel(): PRIMA app.mongoose=');
			console.log(app.mongoose);
			console.log('loadMongooseModel(): DURANTE carico questo schema=');
			console.log(NewSchema);
		}
		*/
		
		
		try {
			app.mongoose.model(modelName, NewSchema);
			//console.log('app.mongoose.model(modelName, NewSchema): passata!');
		} catch( err ) {
			console.log('loadMongooseModel(): ho fallito chiamando app.mongoose.model(modelName, NewSchema)');
		}
		try {
			app.jsl[modelName] = app.mongoose.model(modelName);
			//console.log('app.mongoose.model(modelName): passata!');
		} catch( err ) {
			console.log('loadMongooseModel(): ho fallito chiamando app.mongoose.model(modelName)');
		}
		/*
		console.log('loadMongooseModel(): DOPO model.jslSchema=');
		console.log(model.jslSchema);
		if ( app.jsl[modelName] ) {
			console.log('loadMongooseModel(): DOPO app.jsl[modelName].schema=');
			console.log(app.jsl[modelName].schema);
		}
		if ( app.mongoose ) {
			console.log('loadMongooseModel(): DOPO app.mongoose=');
			console.log(app.mongoose);
		}
		*/
		return true;
	} else {
		console.log('loadMongooseModel(): ho fallito nel testare lo schema con testMongooseSchema(app, model)');
		return false;
	}
}
exports.loadMongooseModel = loadMongooseModel;



/*
questa presuppone che arrivi un modelId, da cui trova lo schema con una query, e poi chiama loadMongooseModel()
a next() passa il name del model caricato
*/
function loadMongooseModelFromId(app, modelId, next, forceReload, alsoLoadRefsModels) {
	var modelName = 'jslmodel_'+modelId;
	//console.log('loadMongooseModelFromId(): forceReload='+forceReload+'  modelId='+ modelId);
	//se ho forceReload ed il model è già caricato, devo forzare un suo delete per poi poterlo ricaricare
	if ( app.jsl[modelName] && forceReload ) {
		//console.log('loadMongooseModelFromId: il model è già caricato, e ho forceReload, quindi lo droppo');
		delete app.jsl[modelName]; 
		//console.log('PRIMA app.mongoose.models[modelName]:');
		//console.log(app.mongoose.models);
		//console.log('PRIMA app.mongoose.modelSchemas:');
		//console.log(app.mongoose.modelSchemas);
		//in pratica per forzare un reload di un model in mongoose devo a mano cancellare il model dai suoi array interni
		delete app.mongoose.models[modelName];
		delete app.mongoose.modelSchemas[modelName];
		//console.log('DOPO app.mongoose.models:');
		//console.log(app.mongoose.models);
		//console.log('DOPO app.mongoose.modelSchemas:');
		//console.log(app.mongoose.modelSchemas);

	}

	//controllo se il model è caricato, altrimenti lo carico
	//nota: se però mi hanno chiesto anche i models relazionati, anche se il mio
	//model è già caricato quelli relazionati possono non esserlo, quindi devo procedere
	//console.log('controllo se è stato caricato il model: '+modelName);
	if ( !app.jsl[modelName] || alsoLoadRefsModels ) {
		//console.log('loadMongooseModelFromId: il model non è caricato oppure mi hanno chiesto anche i models relazionati. modelId = '+modelId);
		//if ( forceReload ) console.log('in realtà ho il reload forzato...');
		//devo recuperare lo schema del mio model
		app.jsl.jslModel
			.findOne( { '_id': modelId } )
			.run(function(err, jslModel) {
				if ( !err ) {
					if ( jslModel ) {
						//console.log('loadMongooseModelFromId(): trovato lo schema del mio model: '+jslModel.jslSchema);
						//trovato lo schema, posso caricare il modello mongoose
						if ( loadMongooseModel(app, jslModel) ) {
							//console.log('modello mongoose caricato correttamente');
							//QUI sembra che io debba forzare un reload dello schema in altro modo
							//direi di no... a me ora sembra vada tutto
							
							//se specificato, carico anche i models relazionati
							if ( alsoLoadRefsModels ) {
								//console.log('loadMongooseModelFromId: mi hanno chiesto di caricare anche i models relazionati');
								var schema = JSON.parse(jslModel.jslSchema);
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
									//console.log('loadMongooseModelFromId: considero questo field:');
									//console.log(field);
									//console.log(fieldObj.type);
									//mi interessano solo i field ObjectId, che però non siano quelli di elementi interni di jslardo
									//(ovvero escludo gli elementi che hanno un model embedded in jslardo, mi interessano solo
									//i model dinamici)
									if ( fieldObj.type == 'ObjectId' && field != 'jslModel' && field != 'author') {
										//console.log('loadMongooseModelFromId: devo tenere questo field:'+field);
										var modelId = fieldObj.ref.substr(9);
										//tutti i campi di tipo ObjectId vanno popolati
										fieldsToBePopulated.push(field);
										//aggiungo il model id al mio array solo se non c'è già dentro
										if ( !app.jsl.utils.in_array( referencedModelsToBeLoaded, modelId ) ) {
											referencedModelsToBeLoaded.push(modelId);
										}
									}
								}
								//console.log('loadMongooseModelFromId: DOPO trovato questi models relazionati:');
								//console.log(referencedModelsToBeLoaded);
								//console.log('loadMongooseModelFromId: DOPO trovato questi fieldsToBePopulated:');
								//console.log(fieldsToBePopulated);
								//ho trovato sia i fileds su cui andrà chiamato il populate(),
								//sia gli id dei models relazionati che ora devo caricare in mongoose.
								//devo chiamare loadMongoose su ciascuno dei models relazionati (se esistono)
								loadMongooseModelsFromId(app, referencedModelsToBeLoaded, function(){
									//ora ho caricato anche i models relazionati, continuo, ritornando i fields da popolare
									next(modelName, fieldsToBePopulated);
								});
							} else {
								//continuo
								next(modelName);
							}
						} else {
							console.log('loadMongooseModelFromId(): loadMongooseModel() returned false');
							next(false);
						}
					} else {
						console.log('loadMongooseModelFromId(): model doesnt exist in db');
						next(false);
					}
				} else {
					console.log('loadMongooseModelFromId(): error retrieving model from db');
					next(false);
				}
			});
	} else {
		//console.log('è già caricato');
		/*
		if ( app.jsl[modelName] ) {
			console.log('loadMongooseModelFromId(): DOPO app.jsl[modelName].schema=');
			console.log(app.jsl[modelName].schema);
		}
		*/
		//ritorno il nome del model dinamico
		next(modelName);
	}
}
exports.loadMongooseModelFromId = loadMongooseModelFromId;


/*
questa esegue un loop asincrono per caricare un array di model con loadMongooseModelFromId()
in input vuole un array di id di models da caricare
*/
function loadMongooseModelsFromId(app, models, next) {
	//console.log('loadMongooseModelsFromId() chiamato con models:');
	//console.log(models);
	if ( models.length == 0 ) {
		//skip
		next();
		return;
	}
	recurse();
	function recurse() {
		if ( models.length > 0 ) {
			loadMongooseModelFromId(app, models.pop(), function(modelName) {
				recurse();
			});
		} else {
			//finito di caricare i models
			next();
		}
	}
}
exports.loadMongooseModelsFromId = loadMongooseModelsFromId;



/* questa fa solo una prova di JSON.parse, e ritorna false su errore */
function testMongooseSchema(app, model) {
	//console.log('testMongooseSchema(): mi chiedono di parsare: '+model.jslSchema);
	try {
		JSON.parse(model.jslSchema);
		return true;
	} catch(err) {
		console.log('testMongooseSchema(): JSON.parse() error: ');
		console.log(err);
		return false;
	}
}

/*
faccio un confronto field a field tra il vecchio
schema nel db e quello nuovo che ho salvato ma non ancora caricato in mongoose
- i campi non presenti nel nuovo schema, vanno eliminati dal db
- i campi presenti nel nuovo schema ma con un datatype diverso, vanno eliminati dal db
altrimenti mi restano in giro e poi quando mongoose carica i contenuti dal
db e questi contenuti hanno dei field in più, da i numeri (pretende di
farci sopra un casting, pur non essendo field previsti nello schema di
mongoose)
ragionamenti:
per esempio se ho eliminato un campo, questo va eliminato anche dal db
altri casi più complessi sono:
un utente potrebbe sempre rinominare un
field, e poi tornare al suo nome originario prima di salvare, oppure può
eliminare un field, e poi rinominarne uno con il nome di quello eliminato
e in questo caso voglio mantenere i dati (a patto che il datatype sia
uguale)
*/
function drop_db_fields(app, modelId, schemaOld, schemaNew, next) {
	//console.log('drop_db_fields: ');
	//console.log('schemaOld: ');
	//console.log(schemaOld);
	//console.log('schemaNew: ');
	//console.log(schemaNew);
	var modelName = "jslmodel_"+modelId;
	//carico sempre il model (se è già caricato non c'è overhead)
	loadMongooseModelFromId(app, modelId, function(){
		//trovo tutti i campi da eliminare
		var fieldsToBeDropped = [];
		for ( var field in schemaOld) {
			//ovviamente a priori non considero i field interni di jslardo
			if ( field != 'jslModel' && field != 'author' && field != 'created' && field != 'status' ) {
				//console.log('# considero il field: '+field);
				/*
				var toBeDropped = false;
				//se sta cambiando la cardinality, droppo
				if ( app.jsl.utils.is_array( schemaOld[field] ) != app.jsl.utils.is_array( schemaNew[field] ) ) {
					//console.log('droppo perchè è cambiata la cardinalità o perchè è stato cancellato');
					toBeDropped = true;
				}
				*/
				
				//devo distinguere a seconda che sia un field array o un field a valore singolo
				if ( app.jsl.utils.is_array( schemaNew[field] ) ) {
					var fieldNewObj = schemaNew[field][0];
					var newCardinality = 'multiple';
				} else {
					var fieldNewObj = schemaNew[field];
					var newCardinality = 'single';
				}
				if ( app.jsl.utils.is_array( schemaOld[field] ) ) {
					var fieldOldObj = schemaOld[field][0];
					var oldCardinality = 'multiple';
				} else {
					var fieldOldObj = schemaOld[field];
					var oldCardinality = 'single';
				}
				/*
				console.log('fieldNewObj:');
				console.log(fieldNewObj);
				console.log('newCardinality:');
				console.log(newCardinality);
				console.log('fieldOldObj:');
				console.log(fieldOldObj);
				console.log('oldCardinality:');
				console.log(oldCardinality);
				*/
				
				//droppo se:
				if (
					//il field è stato cancellato (c'era nel vecchio schema, non c'è più in quello nuovo)
					!fieldNewObj
					||
					//è cambiato il tipo e non si sta passando da String a Number (che invece è consentito)
					( fieldNewObj.type != fieldOldObj.type && !( fieldNewObj.type == 'String' && fieldOldObj.type == 'Number' ) )
					||
					//il tipo resta ObjectIt ma è cambiato il ref
					( fieldNewObj.type == 'ObjectId' && fieldNewObj.type == fieldOldObj.type && fieldNewObj.ref != fieldOldObj.ref )
					||
					//sta cambiando la cardinalità
					newCardinality != oldCardinality
				) {
					fieldsToBeDropped.push(field);
					//console.log('######### lo droppo! #########');
				}
				
				/* vecchia versione, incompleta
				//tengo solo se esiste con lo stesso type nel nuovo schema
				//oppure se esiste e passa da Number a String
				if (
					fieldNewObj && (
						( fieldNewObj.type == fieldOldObj.type )
						|| ( fieldNewObj.type == 'String' && fieldOldObj.type == 'Number' )
					)
				) {
					//ok, il campo nel db si può tenere
					//console.log('lo tengo');
				} else {
					//il campo nel db va eliminato
					//console.log('lo butto');
					toBeDropped = true;
				}
				//alla fine se è il caso metto nell'array
				if (toBeDropped) fieldsToBeDropped.push(field);
				*/
			}
		}	
		//inizio a ricorrere
		//console.log('inizio ciclo di drop dei fileds sui seguenti fields');
		//console.log(fieldsToBeDropped);
		recurse();
		//function che deve ricorrere
		function recurse() {
			if ( fieldsToBeDropped.length > 0 ) {
				var field = fieldsToBeDropped.pop() //poppando l'array si riduce
				//console.log('############## droppo in tutti i record della mia collection il campo: '+field);
				var unset = {};//è l'oggetto di sort
				unset[field] = 1;
				//l'unset va chiamato su ogni singolo record, altrimenti non so perchè mongoose lo blocca
				//quindi prima devo trovare tutti gli id dei record, e poi unsettare ciascuno
				app.jsl[modelName].find({},['_id'],{},function(err, contents){
					if ( !err ) {
						//console.log('per questo model ho contents: ');
						//console.log(contents);
						recurse_on_contents();
						function recurse_on_contents() {
							if ( contents.length > 0 ) {
								var contentId = contents.pop();
								//console.log('###### considero il contentId: '+contentId);
								app.jsl[modelName].update({'_id':contentId},{ $unset : unset }, false, true  )
								.run(function(err) {
									if ( !err ) {
										//console.log('###eliminato! adesso ricorro');
										recurse_on_contents();
									} else {
										console.log('drop_db_fields(): query error droppando il field: '+field+' - '+err);
									}
								});
							} else {
								//finito
								//riprendo la ricorsione di primo livello
								recurse();
							}
						}
					} else {
						console.log('drop_db_fields(); query error finding contents ids: '+err);
					}
				});
			} else {
				//finito
				//console.log('finito');
				next();
			}
		}
	});
	
	
	
}




//ciclo su tutti i campi dello schema, e quelli che trovo vuoti nel form, li unsetto
function unsetEmptyFields(app,req,res,content,contentData,next){
	//trovato lo schema
	var schema = JSON.parse(content.jslModel.jslSchema);
	var contentId = content._id;
	var modelId = content.jslModel._id;
	/*
	console.log('trovato lo schema!');
	console.log(schema);
	*/
	//ciclo su ogni field, e cerco quelli di tipo ObjectId vuoti nel form
	var toBeUnsettedFields = [];
	for(var field in schema) {
		//non devo mai popolare alcuni field interni di jslardo, perchè non vengono gestiti dal form
		if ( field == 'status' || field == 'author' || field == 'created' || field == '_id' || field == 'jslModel' || field == 'created' ) {
			//skippo
		} else {
			//console.log('### considero il field: '+field);
			//console.log('content[field]: '+content[field]);
			//console.log('contentData[field]: '+contentData[field]);
			if ( app.jsl.utils.is_array( schema[field] ) ) {
				var fieldObj = schema[field][0];
			} else {
				var fieldObj = schema[field];
			}
			
			//console.log('schema[field].type: '+fieldObj.type);
			//devo unsettare solo i field di tipo ref
			if ( fieldObj.type == 'ObjectId' ) {
				if (!contentData[field]) {
					//console.log('unsetto!');
					//devo unsettare
					toBeUnsettedFields.push(field);
				}
			}
		}
	}
	loadMongooseModelFromId(app, modelId, function(modelName){
		//console.log('devo unsettare:');
		//console.log(toBeUnsettedFields);
		recurse();
		function recurse() {
			if ( toBeUnsettedFields.length > 0 ) {
				var field = toBeUnsettedFields.pop();
				var unset = {};//è l'oggetto di sort
				unset[field] = 1;
				app.jsl[modelName].update({'_id':contentId},{ $unset : unset }, false, true  )
				.run(function(err) {
					if ( !err ) {
						//console.log('###eliminato! adesso ricorro');
						recurse();
					} else {
						console.log('unsetEmptyFields(): query error droppando il field: '+field+' - '+err);
					}
				});
			} else {
				//finito
				next();
			}
		}
	});
}
exports.unsetEmptyFields = unsetEmptyFields; 



/*
fa il parsing di un json e ne fornisce una rappresentazione in html
schema è un json in stringa
*/
function drawSchema(schema, app) {
	var jsonObj = JSON.parse(schema);
	var output = '';
	recurse(jsonObj);
	return output;
	function recurse(jsonChunk) {
		output += '<div class="outerContMinimal"><table>'
		for ( var field in jsonChunk) {
			//a priori skippo i field insterni di jslardo
			if ( field == 'author' || field == 'created' || field == 'status' || field == 'jslModel' ) {
				//skippo
			} else {
				if ( typeof jsonChunk[field] === 'object' ) {
					//si tratta di un field che ha come contenuto un object on un array
					//vedo se è un array o un singolo
					if ( app.jsl.utils.is_array( jsonChunk[field] ) ) {
						var fieldObj = jsonChunk[field][0];
					} else {
						var fieldObj = jsonChunk[field];
					}
					output += '<tr><td valign="top" align="right"><h5>'+fieldObj.name_full+'</h5></td><td>';
					recurse(fieldObj);
					output += '</td></tr>';
				} else {
					//il mio field ha un contenuto normale
					//output
					output += '<tr>';
					switch(field){
						case 'type':
							//trovo l'icona da usare per il mio datatype
							//if ( jsonChunk[field] == 'ObjectId' ) jsonChunk[field] = 'Model';
							var datatype = app.jsl.datatypeByName(jsonChunk[field]);
							//output
							output += '<td colspan="2"><div class="innerCont"><img class="floatLeft" src="/images/pov/'+datatype.icon+'_40x30.png"/>&nbsp;<span>'+jsonChunk[field]+'</span></div></td>';
							break;
						case 'required':
							//output
							if (app.jsl.utils.bool_parse(jsonChunk[field]))
								output += '<td colspan="2"><h6>required</h6></td>';
							break;
						case 'description':
							//output
							if (jsonChunk[field])
								output += '<td colspan="2"><p>'+jsonChunk[field]+'</p></td>';
							break;
						default:
							//output
							//output += '<td align="right">'+field+':</td><td><h6>'+jsonChunk[field]+'</h6></td>';
							break;
					}
					output += '</tr>';
				}
			}
		}
		output += '</table></div>'
	}
}
exports.drawSchema = drawSchema; 










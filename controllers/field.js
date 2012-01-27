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
field
*/

function defineRoutes(app) {

	
	//GET: field form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	//il parametro id è obbligatorio, ed è inteso come l'id del model cui appartiene questo field. serve per controllare i permessi
	app.get('/fields/edit/:id/:name/:name_full/:type/:type_model/:type_cardinality/:required/:description?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//costruisco l'oggetto per popolare il form
		var element = {
			name_full: req.params.name_full,
			name: req.params.name,
			old_name: req.params.name, //questa mi serve per memorizzare il nome originario del field
			type: req.params.type,
			old_type: req.params.type, //questa mi serve per memorizzare il type originario del field
			type_model: req.params.type_model,
			old_type_model: req.params.type_model, //questa mi serve per memorizzare il type_model originario del field
			type_cardinality: req.params.type_cardinality,
			old_type_cardinality: req.params.type_cardinality, //questa mi serve per memorizzare il type_cardinality originario del field
			description: req.params.description,
			required: req.params.required,
			model: req.params.id
		};
		//devo leggere tutti i model disponibili per il mio user
		app.jsl.jslModelController.getJslModels(req,res,function(jslModels){
			//posso popolare il form per il mio field
			res.render('fields/form', {
				layout: 'layoutPopup',
				title: app.i18n.t(req,'modify field'),
				elementName: 'field',
				element: element,
				msg: req.params.msg,
				combo_types: app.jsl.datatypes,
				combo_models: jslModels
			});	
		});
	});






	//JSON ROUTES

	//POST: json field: add internal jslardo fields to a new schema
	app.post('/json/fields/addInternalFields', app.jsl.perm.readStrucPermDefault, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//console.log(req.params);
		//è l'oggeto coi parametri che mi arrivano in post
		res.json(addInternalFields(req.body));
	});	
	



}
exports.defineRoutes = defineRoutes;
 

//add internal jslardo fields to a new schema
function addInternalFields(schema) {
	/*
	'author': { type: Schema.ObjectId, ref: 'user', required: true, index: true },
	'status': { type: String, required: true, enum: ['public', 'private', 'share'], index: true },
	'created': { type: Date, required: true }
	*/
	schema.jslModel = { 'type': 'ObjectId', 'ref': 'jslModel', 'required': true, 'index': true };
	schema.author = { 'type': 'ObjectId', 'ref': 'user', 'required': true, 'index': true };
	schema.created = { 'type': 'Date', 'required': true };
	schema.status = { 'type': 'String', 'required': true, 'enum': ['public', 'private', 'share'], 'index': true };
	return schema;
}
exports.addInternalFields = addInternalFields;
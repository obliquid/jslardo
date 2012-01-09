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
	app.get('/fields/edit/:id/:name/:type/:required/:description?', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		//costruisco l'oggetto per popolare il form
		var element = {
			name: req.params.name,
			old_name: req.params.name, //questa mi serve per memorizzare il nome originario del field
			type: req.params.type,
			old_type: req.params.type, //questa mi serve per memorizzare il type originario del field
			description: req.params.description,
			required: req.params.required,
			model: req.params.id
		};
		res.render('fields/form', {
			layout: 'layoutPopup',//OK per il layout, ma è da implementare il callback
			title: app.i18n.t(req,'modify field'),
			elementName: 'field',
			element: element,
			msg: req.params.msg,
			combo_types: app.jsl.utils.datatypes
		});	
		/*
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio field dal db, e assegno il result al tpl
		app.jsl.field.findOne(
			{ '_id': req.params.id },
			function(err, field) {
				if (!err)
				{
					res.render('fields/form', { 
						title: app.i18n.t(req,'modify field'),
						elementName: 'field',
						element: field,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.utils.errorPage(res, err, "GET: field form (modify): failed query on db");
				}	
					
			}
		);
		*/
	});
	/* in realtà questa non la uso mai perchè il form comunica direttamente con il suo opener, non chiama una route di save
	//POST: field form (modify)
	//il parametro id è obbligatorio, ed è inteso come l'id del model cui appartiene questo field. serve per controllare i permessi
	app.post('/fields/edit/:id', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnJslModelId, function(req, res, next){
		app.jsl.routes.routeInit(req);
		
		console.log('name: '+req.body.name);
		console.log('type: '+req.body.type);
		
		
	});
	*/
	
}
exports.defineRoutes = defineRoutes;
 

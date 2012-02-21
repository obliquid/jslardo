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
statement
*/

function defineRoutes(app) {

	
	//GET: statement form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	//il parametro id è obbligatorio, ed è inteso come l'id del div (in quanto ingloba un controller) cui appartiene questo statement. serve per controllare i permessi
	app.get('/statements/edit/:id/:name/:type/:jslModel', app.jsl.perm.readStrucPermDefault, app.jsl.perm.needStrucPermModifyOnDivId, function(req, res, next){
//var src = '/statements/edit/'+'#{element._id}'+'/'+jsonStatement.name+'/'+jsonStatement.type;
		app.jsl.routes.routeInit(req);
		//costruisco l'oggetto per popolare il form
		var element = {
			name: req.params.name,
			old_name: req.params.name, //questa mi serve per memorizzare il nome originario del statement
			type: req.params.type,
			old_type: req.params.type, //questa mi serve per memorizzare il type originario del statement
			jslModel: req.params.jslModel
		};
		//devo leggere tutti i model disponibili per il mio user
		app.jsl.jslModelController.getJslModels(req,res,function(jslModels){
			//posso popolare il form per il mio statement
			res.render('statements/form', {
				layout: 'layoutPopup',
				title: app.i18n.t(req,'modify statements'),
				elementName: 'statement',
				element: element,
				msg: req.params.msg,
				//combo_types: app.jsl.statementsDictionary,
				combo_models: jslModels
			});	
		});
	});
}
exports.defineRoutes = defineRoutes;

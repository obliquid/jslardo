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




	



// VARIE


/*
i data types supportati.
non devono mai essere enumerti esplicitamente, ma sempre leggendo questo oggetto: app.jsl.utils.datatypes

convenzioni:
name: sempre maiuscolo, per i tipi semplici è anche il datatype javascript

*/
  
var datatypes = [
	{
		name: 'String', //this is a string
		icon: 'icon_data_string' //this is the radix name of images to be used, with images like: /images/pov/icon_data_string_20x15.png
	},
	{
		name: 'Number',
		icon: 'icon_data_double'
	},
	{
		name: 'Boolean',
		icon: 'icon_data_flag'
	},
	{
		name: 'Model',
		icon: 'icon_core_jslModel'
	}
];
datatypes.stringify = function() {
	return JSON.stringify(datatypes);
}
exports.datatypes = datatypes;

function datatypeByName(name) {
	for (var i=0; i<datatypes.length; i++) {
		if ( datatypes[i].name == name ) return datatypes[i];
	}
}
exports.datatypeByName = datatypeByName;

/* visualizza una pagina di errore e logga sulla console */
function errorPage(res, errMsg, publicMsg, useLayout) {
	if ( useLayout === undefined ) useLayout = true;
	console.log(errMsg);
	res.render('error', {
		layout: useLayout,
		errMsg: errMsg,
		publicMsg: publicMsg
	});			
}
exports.errorPage = errorPage; 


/*
questa serve quando mi arriva da un form l'oggetto req.body con tutti i campi del form, e devo salvarli nell'oggetto mongoose.
per non dover scrivere condice embedded (un assegnamento per ogni campo del form), c'è questo metodo che loopa su tutti i campi che arrivano dal form
e li salva pari pari nell'oggetto che andrà nel db.
*/
function populateModel(model, modelData) {
	//questa va lasciata così, e poi ne va creata un'altra populateContentModel che
	//fa un matching delle property da popolare direttamente sullo schema del mio model
	/*
	if( modelData.hasOwnProperty('titolo') ) {
		console.log('e titolo è pure una ownProperty di modelData!!!');
	}
	console.log('populateModel');
	console.log('model:');
	console.log(model);
	console.log('modelData:');
	console.log(modelData);
	console.log('modelData.titolo:');
	console.log(modelData.titolo);
	console.log('typeof modelData.titolo:');
	console.log(typeof modelData.titolo);
	*/
	//if(modelData.hasOwnProperty('titolo') && typeof modelData['titolo'] !== 'function') {
	
	
	
	//ciclo su tutte le property che mi arrivano in modelData (le dovrò replicare in model)
	for(var prop in modelData) {
		if(modelData.hasOwnProperty(prop) && typeof modelData[prop] !== 'function')
		{
			//assegno a model la mia property, ma solo se non si tratta dell'id
			if( prop != "id" )
			{
				/*
				console.log('### considero la prop: '+prop+' ###');
				console.log('typeof modelData[prop]='+typeof modelData[prop]);
				console.log('typeof model[prop]='+typeof model[prop]);
				console.log('modelData[prop]='+modelData[prop]);
				console.log('model[prop]='+model[prop]);
				*/
				//porcheria per gestire i valori boolean
				//il form tratta tutto come string mentre lo schema mongoose è tipizzato
				//quandi un 'false' che arriva da un form diventerebbe un true nel db in quanto stringa non vuota castata a boolean
				if ( modelData[prop] == 'sure_this_is_true' ) {
					model[prop] = true;
				} else if ( modelData[prop] == 'sure_this_is_false' ) {
					model[prop] = false;
				} else {
					model[prop] = modelData[prop];
				}
			}
		}
	}
	/*
	console.log('populateModel alla fine');
	console.log('model:');
	console.log(model);
	console.log('modelData:');
	console.log(modelData);
	*/
}
exports.populateModel = populateModel;

function trunc(string,length) {
	if ( string.length > length ) {
		return string.substr(0,length)+'...';
	} else {
		return string;
	}
}
exports.trunc = trunc; 




/*
questa serve quando mi arriva un'istanza di un content (modelData), e devo salvarla nell'istanza mongoose di un element (model).
si basa sullo schema del model mongoose, e in base a quello popola solo i fields necessari
*/
/* in teoria funziona, ma non la uso, uso sempre populateModel
function populateContentModel(app, req, res, element, content, next) {
	console.log('populateContentModel:');
	console.log('element:');
	console.log(element);
	console.log('content:'); //content.element
	console.log(content);
	//popolo element per trovare lo schema (element non ha la sua property jslModel popolata, e lo schema sta in element.jslModel.jslSchema)
	app.jsl.element.findOne( { '_id': element._id } )
	.populate('jslModel')
	.run( function(err, elementPopulated) {
		if (!err)
		{
			if ( elementPopulated ) {
				//trovato lo schema
				var schema = JSON.parse(elementPopulated.jslModel.jslSchema);
				console.log('trovato lo schema!');
				console.log(schema);
				//ciclo su ogni field, e popolo solo quelli nell'element
				for(var field in schema) {
					console.log('considero il field: '+field);
					console.log('element[field]: '+element[field]);
					console.log('content[field]: '+content[field]);
					element[field] = content[field];
					console.log('dopo assegnamento element[field]: '+element[field]);
				}
				console.log('populateContentModel alla fine:');
				console.log('element:');
				console.log(element);
				console.log('element[titolo]: '+element['titolo']);
				console.log('content:'); //content.element
				console.log(content);
				//finito di popolare
				next();
				
				
				
			} else {
				console.log("populateContentModel(): element not found");
			}	
		} else {
			console.log("populateContentModel(): failed query to retrieve element");
		}	
			
	});	
	//var jsonSchema = JSON.parse(content.jsonModel.jslSchema);
	//console.log('jsonSchema:');
	//console.log(jsonSchema);
}
exports.populateContentModel = populateContentModel; 
*/


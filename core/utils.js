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
		label: 'Stringazza', //this is a string
		icon: 'icon_data_string' //this is the radix name of images to be used, with images like: /images/pov/icon_data_string_20x15.png
	},
	{
		name: 'Number',
		label: 'Numberone',
		icon: 'icon_data_double'
	},
	{
		name: 'Boolean',
		label: 'Booleano',
		icon: 'icon_data_flag'
	},
	{
		name: 'Date',
		label: 'Date and time',
		icon: 'icon_data_date'
	},
	{
		name: 'ObjectId',
		label: 'Modello',
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
	console.log('############### populateModel');
	console.log('model:');
	console.log(model);
	console.log('modelData:');
	console.log(modelData);
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
	console.log('############### populateModel alla fine');
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

var is_array = function (value) {
	//versione easy: return value && typeof value === 'object' && value.constructor === Array;
	return Object.prototype.toString.apply(value) === '[object Array]'; //questo va anche per array definiti in altre windows o frame
};
exports.is_array = is_array; 

var in_array = function (arr,obj) {
    return (arr.indexOf(obj) != -1);
}
exports.in_array = in_array; 

var splice_by_element = function (my_array,array_element) {
	for(var i=0; i<my_array.length;i++ ) { 
		if ( my_array[i] == array_element ) {
			my_array.splice(i,1); 
		}
	}
	return my_array;
}
exports.splice_by_element = splice_by_element; 

/*
quando si ha un valore booleano che non si sa se è di tipo booleano
o di tipo stringa (cioè un booleano convertito in stringa 'true' o 'false')
questa function la ritrasforma in booleano
*/
var bool_parse = function (my_bool_string) {
	if ( !my_bool_string || my_bool_string == 'false' ) {
		return false;
	} else {
		return true;
	}
}
exports.bool_parse = bool_parse; 



/*
questa serve quando mi arriva un'istanza di un content, e devo popolarla per poterla salvare nell'istanza mongoose di un element.
si basa sullo schema del model mongoose, e in base a quello popola solo i fields necessari
*/
function populateContentModel(app, req, res, content, contentData, next) {
	/*
	console.log('###### populateContentModel:');
	console.log('content:');
	console.log(content);
	console.log('contentData:');
	console.log(contentData);
	*/
	
	//trovo il modelId (dipende se mi passano un content con il field jslModel già popolato o meno)
	if ( content.jslModel._id ) {
		var modelId = content.jslModel._id;
	} else {
		var modelId = content.jslModel;
	}
	
	//leggo dal db il mio model, per avere lo schema
	app.jsl.jslModel.findOne( { '_id': modelId } )
	.run( function(err, jslModel) {
		if (!err)
		{
			if ( jslModel ) {
				//trovato lo schema
				var schema = JSON.parse(jslModel.jslSchema);
				/*
				console.log('trovato lo schema!');
				console.log(schema);
				*/
				//ciclo su ogni field, e popolo solo quelli nell'content
				for(var field in schema) {
					//non devo mai popolare alcuni field interni di jslardo, perchè non vengono gestiti dal form
					if ( field == 'author' || field == 'created' ) {
						//skippo
					} else {
						/*
						console.log('### considero il field: '+field);
						console.log('content[field]: '+content[field]);
						console.log('contentData[field]: '+contentData[field]);
						*/
						//prima distinguo a seconda che sia un field array o a valore singolo
						if ( is_array( schema[field] ) ) {
							//è un array, per ora gestisco solo valori separati da virgola, perchè mi aspetto solo degli ObjectIds
							//console.log(field+' è un array!');
							if ( contentData[field] ) content[field] = contentData[field].split(',');
							/*
							//per ogni ObjectId devo istanziare la relativa istanza, e aggiungerla al mio content
							var ObjectIds = contentData[field].split(',');
							for ( var i = 0; i < ObjectIds.length; i++ ) {
								content[field].push( ObjectIds[i] );
							}
							*/
						} else {
							//non è un array, fisso il suo valore
							//console.log(field+' è un single!');
							//distinguo a seconda del datatype
							switch ( schema[field].type ) {
								case 'ObjectId':
									//nel caso degli ObjectId non assegno un field se non ha l'ObjectId definito
									if ( contentData[field] ) content[field] = contentData[field];
									break;
								default:
									//porcheria per gestire i valori boolean
									//il form tratta tutto come string mentre lo schema mongoose è tipizzato
									//quandi un 'false' che arriva da un form diventerebbe un true nel db in quanto stringa non vuota castata a boolean
									if ( contentData[field] == 'sure_this_is_true' ) {
										content[field] = true;
									} else if ( contentData[field] == 'sure_this_is_false' ) {
										content[field] = false;
									} else {
										content[field] = contentData[field];
									}
									break;
							}
						}
						/*
						console.log('dopo assegnamento content['+field+']: ');
						console.log(content[field]);
						*/
					}
				}
				/*
				console.log('###### populateContentModel alla fine:');
				console.log('content:');
				console.log(content);
				console.log('contentData:');
				console.log(contentData);
				*/
				//finito di popolare
				next();
				
				
				
			} else {
				console.log("populateContentModel(): element not found");
			}	
		} else {
			console.log("populateContentModel(): failed query to retrieve element");
		}	
			
	});	
	//var jsonSchema = JSON.parse(contentData.jsonModel.jslSchema);
	//console.log('jsonSchema:');
	//console.log(jsonSchema);
}
function quarantinePopulateContentModel(app, req, res, content, contentData, next) {
	/*
	console.log('###### populateContentModel:');
	console.log('content:');
	console.log(content);
	console.log('contentData:');
	console.log(contentData);
	*/
	//popolo element per trovare lo schema (element non ha la sua property jslModel popolata, e lo schema sta in element.jslModel.jslSchema)
	app.jsl.element.findOne( { '_id': content.element } )
	.populate('jslModel')
	.run( function(err, elementPopulated) {
		if (!err)
		{
			if ( elementPopulated ) {
				//trovato lo schema
				var schema = JSON.parse(elementPopulated.jslModel.jslSchema);
				/*
				console.log('trovato lo schema!');
				console.log(schema);
				*/
				//ciclo su ogni field, e popolo solo quelli nell'content
				for(var field in schema) {
					/*
					console.log('### considero il field: '+field);
					console.log('content[field]: '+content[field]);
					console.log('contentData[field]: '+contentData[field]);
					*/
					//prima distinguo a seconda che sia un field array o a valore singolo
					if ( is_array( schema[field] ) ) {
						//è un array, per ora gestisco solo valori separati da virgola, perchè mi aspetto solo degli ObjectIds
						//console.log(field+' è un array!');
						if ( contentData[field] ) content[field] = contentData[field].split(',');
						/*
						//per ogni ObjectId devo istanziare la relativa istanza, e aggiungerla al mio content
						var ObjectIds = contentData[field].split(',');
						for ( var i = 0; i < ObjectIds.length; i++ ) {
							content[field].push( ObjectIds[i] );
						}
						*/
					} else {
						//non è un array, fisso il suo valore
						//console.log(field+' è un single!');
						//distinguo a seconda del datatype
						switch ( schema[field].type ) {
							case 'ObjectId':
								//nel caso degli ObjectId non assegno un field se non ha l'ObjectId definito
								if ( contentData[field] ) content[field] = contentData[field];
								break;
							default:
								content[field] = contentData[field];
								break;
						}
					}
					/*
					console.log('dopo assegnamento content['+field+']: ');
					console.log(content[field]);
					*/
				}
				/*
				console.log('###### populateContentModel alla fine:');
				console.log('content:');
				console.log(content);
				console.log('contentData:');
				console.log(contentData);
				*/
				//finito di popolare
				next();
				
				
				
			} else {
				console.log("populateContentModel(): element not found");
			}	
		} else {
			console.log("populateContentModel(): failed query to retrieve element");
		}	
			
	});	
	//var jsonSchema = JSON.parse(contentData.jsonModel.jslSchema);
	//console.log('jsonSchema:');
	//console.log(jsonSchema);
}
exports.populateContentModel = populateContentModel; 


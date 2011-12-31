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

/* carica la route di default da usare quando nessuna altra route è stata matchata */
//non va
function defineRoute404(app) {
	/*
	app.get('*', function(req, res){
		app.jsl.routeInit(req);
		errorPage(res, "404 not found: "+req.path);	
	});	
	*/
}

/*
questa serve quando mi arriva da un form l'oggetto req.body con tutti i campi del form, e devo salvarli nell'oggetto mongoose.
per non dover scrivere condice embedded (un assegnamento per ogni campo del form), c'è questo metodo che loopa su tutti i campi che arrivano dal form
e li salva pari pari nell'oggetto che andrà nel db.
*/
function populateModel(model, modelData) {
	/*
	console.log('populateModel');
	console.log(model);
	console.log(modelData);
	*/
	//ciclo su tutte le property che mi arrivano in modelData (le dovrò replicare in model)
	for(var prop in modelData) {
		if(modelData.hasOwnProperty(prop))
		{
			//assegno a model la mia property, ma solo se non si tratta dell'id
			if( prop != "id" )
			{
				/*
				console.log('typeof modelData[prop]='+typeof modelData[prop]);
				console.log('typeof model[prop]='+typeof model[prop]);
				console.log('modelData[prop]='+modelData[prop]);
				console.log('model[prop]='+model[prop]);
				*/
				//faccio un po' di casting perchè in modelData vanno persi dei type
				if ( typeof model[prop] === 'boolean' )
				{
					if ( modelData[prop] == 'yes' ) {
						model[prop] = true;
					} else {
						model[prop] = false;
					}
				} else {
					model[prop] = modelData[prop];
				}
			}
		}
	}
}


exports.defineRoute404 = defineRoute404; 
exports.errorPage = errorPage; 
exports.populateModel = populateModel; 




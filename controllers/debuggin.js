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
debuggin
*/

function defineRoutes(app) {

	//GET: debuggin
	app.get('/debug', function(req, res) {
		app.jsl.routeInit(req);
		//faccio qualcosa
		console.log("debug: faccio qualcosa...");
		
		
		var counter = 0;
		var counterLimit = 1000;
		saveInDb();
		
		function saveInDb()
		{
			//creo nuovo debuggin
			var my_debuggin = new app.jsl.debuggin();
			//popolo il mio debuggin
			my_debuggin.somevalue = String(Math.random());
			//salvo il nuovo debuggin
			my_debuggin.save(saveResult);
		}
		
		function saveResult(err) {
			if (!err) 
			{
				//ho creato con successo il mio debuggin nuovo
				counter++;
				if( counter < counterLimit )
				{
					saveInDb();
				}
				else
				{
					//finito. rimando in home
					res.redirect('/');
				}
				
			}
			else
			{
				app.jsl.errorPage(res, err, "POST: debuggin error on query");
			}
		}
		
		
		
		
		
		
		
		
		
	});
	

		
	
}

exports.defineRoutes = defineRoutes; 

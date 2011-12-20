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




	
// ROUTES


/* carica le routes interne di jslardo */
function defineRoutes(app) {
	
	
	//controllo che sito è richiesto, se il sito di admin, o se un sito pubblico degli utenti
	app.get('*', function(req, res, next){
		//app.jsl.routeInit(req);
		//console.log(req.headers.host);
		//console.log(req.url);
		//il sito di admin può anche girare su un ip, mentre i siti degli utenti (v.sotto) possono girare solo su un dominio
		//il dell'admin deve essere in una delle forme:
		//admindomain
		//admindomain:adminport
		//adminip
		//adminip:adminport
		if
		(
			req.headers.host == app.jsl.config.domain ||
			req.headers.host == app.jsl.config.domain+":"+app.jsl.config.port ||
			req.headers.host == app.jsl.config.ip ||
			req.headers.host == app.jsl.config.ip+":"+app.jsl.config.port
		)
		{
			//è stato richiesto il sito di admin, posso procedere nel processare le route
			next();
		}
		else
		{
			//non è stato richiesto il sito di admin, controllo se è stato richiesto un sito pubblico
			
			//prima leggo tutti i domini dei siti pubblici o share
			var conditions = 
				{ $or: [
						{ 'status': 'public' }, 
						{ 'status': 'share' }
				]};
			app.jsl.site.find(
				conditions,
				function(err, sites) {
					//il dominio richiesto, per appartenere ad un sito di un'utente, deve essere in una delle forme:
					//sitedomain
					//sitedomain:adminport
					//sitedomain.admindomain
					//sitedomain.admindomain:adminport
					for (var x=0;x<sites.length;x++)
					{
						if
						(
							req.headers.host == sites[x].domain ||
							req.headers.host == sites[x].domain+":"+app.jsl.config.port ||
							req.headers.host == sites[x].domain+"."+app.jsl.config.domain ||
							req.headers.host == sites[x].domain+"."+app.jsl.config.domain+":"+app.jsl.config.port
						)
						{
							//trovato il mio sito
							//QUI!!!
							//cerco tra tutte le pagine una con la mia route
							//se non la trovo, cerco la pagina home
							//se non c'è nemmeno la home, msg di errore perchè il sito non ha pagine
							res.render('debug', {
								layout: false, 
								variable: 'my content!'
							});								
							
							
							
							
							
							
							
							
							break;
						}
					}
					
					
					
					
				}
			);				
			
			
		}
		
		/*
		if(req.headers.host == 'some.sub.domain.com')  //if it's a sub-domain
			req.url = '/mysubdomain' + req.url;  //append some text yourself
		*/
	}); 	
	
	
	
	
	
	
	
	
	
	//GET: home
	app.get('/', app.jsl.readStrucPermDefault, function(req, res){ 
		app.jsl.routeInit(req);
		res.render('home', {
		});
	});

	//POST: login signin
	app.post('/signin', function(req, res) {
		app.jsl.routeInit(req);
		//controllo se esiste il mio utente nel db
		app.jsl.checkValidUser(req, function(result, user_id) { 
			if ( result )
			{
				//ho trovato lo user nel db (oppure sono superadmin)
				//il login è valido
				app.jsl.setSignedIn(req, user_id);
				console.log("POST: login signin: login succeded for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
			else
			{
				//il mio utente non c'è nel db
				app.jsl.setSignedOut(req);
				console.log("POST: login signin: login failed for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
		});	
	});
	
	//GET: login signout
	app.get('/signout', function(req, res) {
		app.jsl.routeInit(req);
		//resetto le session
		console.log("POST: login signout: for user: "+req.session.email);
		app.jsl.setSignedOut(req);
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	//GET: change language
	app.get('/lan/:locale?', function(req, res) {
		app.jsl.routeInit(req);
		//cambio la lingua
		//req.session.currentLocale = req.params.locale;
		//console.log("prima nei cookie ho:");
		//console.log(req.cookies);
		res.cookie('currentlocale', req.params.locale, { expires: new Date(Date.now() + app.jsl.config.cookiesDurationMs), path: '/' });
		//console.log('dopo nei cookies ho: ');
		//console.log(req.cookies);
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	
	/*
	FILTERS
	nota: ora li tengo qui, ma se aumentano sarà meglio metterli, ove possibile, nei rispettivi controllers js
	*/
	
	//GET: list filter All or Mine
	app.get('/filterAllOrMine/:filterOn', function(req, res) {
		app.jsl.routeInit(req);
		//posso filtrare sui miei elementi solo se sono loggato, e se non sono superadmin
		if ( req.session.loggedIn && req.session.user_id != 'superadmin' )
		{
			//sono loggato, non come superadmin, quindi posso filtrare
			req.session.filterAllOrMine = req.params.filterOn;
		}
		else if ( req.session.loggedIn && req.session.user_id == 'superadmin' )
		{
			//sono loggato come superadmin, non posso filtrare sui miei elementi ma solo su tutti
			req.session.filterAllOrMine = 'all';
		}
		else
		{
			//se invece sto cercando di attivare il filtering senza essere loggato, forzo un loagout che mi azzera tutte le sessions
			setSignedOut(req);
		}
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	//GET: filter by site
	//nota: se si passa anche il parametro andGotoUrl, questo deve essere URIencodato: in jade usare #{encURI('url')}
	app.get('/filterBySite/:site?/:andGotoUrl?', function(req, res) {
		app.jsl.routeInit(req);
		//prima definisco su che url fare il redirect
		var redirectTo = ( req.params.andGotoUrl != '' && req.params.andGotoUrl != undefined ) ? decodeURIComponent(req.params.andGotoUrl) : 'back';
		//inizialmente azzero la session per il filtraggio
		req.session.filterBySite = undefined;
		//verifico se mi è arrivato un site su cui filtrare
		if ( req.params.site != '' && req.params.site != undefined )
		{
			//leggo i siti su cui posso filtrare, per verificare che l'utente stia cercando di filtrare su un sito a lui consentito
			app.jsl.siteController.getSites(req,res,function(sites) {
				if (sites)
				{
					//posso filtrare su dei sites. verifico se quello richiesto è tra quelli papabili
					//nota: non posso usare array.forEach perchè devo poter usare break;
					for (var x=0;x<sites.length;x++)
					{
						if ( sites[x]._id == req.params.site )
						{
							//trovato il mio sito, posso usarlo per filtrare
							//imposto le session ed esco dal ciclo
							req.session.filterBySite = req.params.site;
							break;
						}
					}
					//ricarico la pagina da cui arrivavo
					res.redirect(redirectTo);				
				}
				else
				{
					//se non mi sono arrivati sites, vuol dire che non posso filtrare su niente
					//ricarico la pagina da cui arrivavo
					res.redirect(redirectTo);				
				}
			});
		}
		else
		{
			//non mi è arrivato il site, che vuol dire che non devo filtrare su nessun site
			//ricarico la pagina da cui arrivavo
			res.redirect(redirectTo);
		}
	});
	

	
	
}


/* questa va richiamata da ogni route, e compie operazioni utili e comuni a tutte le route.
nota che i controlli sui permessi vengono fatti dal middleware, questa servirà ad altro */
function routeInit(req)
{
	//prima loggo la route in cui sono entrato
	console.log('route matched: ('+req.route.method.toUpperCase()+') '+req.route.path);	
	
	//salvo nelle sessions la pagina in cui mi trovo (cioè il primo chunk del path)
	var chunks = req.route.path.split("/");
	req.session.currentPage = chunks[1];
}





exports.defineRoutes = defineRoutes; 
exports.routeInit = routeInit; 




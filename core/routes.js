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
	
	//NON-ADMIN route
	//prima considero le route dei siti degli utenti
	app.get('/:route?', app.jsl.perm.readStrucPermDefault, function(req, res, next)
	{
		//non so perchè ma quando viene richiesto un file statico, le sessions non sono definite
		//quindi se non sono deifnite, deduco si tratti di un file statico, e skippo
		if ( !req.session )
		{
			next();
			//non faccio niente
			//console.log("negot per:"+req.url);
		}
		//se stanno chiamando un service json skippo oltre
		else if ( req.params.route == 'json' )
		{
			next();
			console.log('stanno chiamando un json, skippo oltre');
		}
		else{
			app.jsl.routes.routeInit(req);
			//console.log("vabè per:"+req.url);
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
				//è stato richiesto il sito di admin, posso procedere nel processare le route di admin
				next();
			}
			else
			{
				//non è stato richiesto il sito di admin, controllo se è stato richiesto un sito pubblico
				//console.log('passo da qui'+req.session.loggedIn);
				//console.log(req);
				//prima però devo leggere i permessi
				//app.jsl.perm.readStrucPermDefault(req, res, function()
				//{
				//var express = require('express');
				//app.use(express.static(__dirname + '/public'));
				
				////if ( !req.session )
				////{
					////next();
					//////non faccio niente
				////}
				////else
				////{
				
					//controllo se esiste nel db il sito (host) richiesto
					var conditions = ( req.session.user_id == 'superadmin' ) 
					? 
					{
						'domain': req.headers.host
					}
					:
					{
						'domain': req.headers.host,
						$or: [
							{ 'status': 'public' }, 
							{ 'status': 'share' }, 
							{'author': req.session.user_id }
						]
					};
					//console.log('e qui'+req.session.loggedIn);
					app.jsl.site.findOne(
						conditions,
						function(err, site) {
							//console.log('e anche qui'+req.session.loggedIn);
							if ( !err )
							{
								if ( site )
								{
									//il sito richiesto esiste nel db
									/*
									res.render('debug', {
										layout: false, 
										variable: 'beccato sito: '+req.headers.host
									});
									*/
									//cerco tra tutte le pagine del sito permesse al mio utente una con la mia route
									//se la route è nulla, automaticamente uscirà la pagina di root
									//console.log('e anche qui pure'+req.session.loggedIn);
									var conditions = ( req.session.user_id == 'superadmin' ) 
									? 
									{
										'site': site.id,
										'route': ( req.params.route ) ? req.params.route : ''
										//'route': req.url.substring(1)
									} 
									: 
									{
										'site': site.id,
										'route': ( req.params.route ) ? req.params.route : '',
										//'route': req.url.substring(1), 
										$or: [
											{ 'status': 'share' }, 
											{ 'status': 'public' }, 
											{ 'author': req.session.user_id }
									]};
									app.jsl.page
										.findOne(
											conditions,
											[], 
											{}
										)
										.populate('site')
										.run(function(err, page) {
											//console.log('e anche qui pure forse'+req.session.loggedIn);
											if ( !err )
											{
												if ( page )
												{
													//console.log('e anche qui pure forse magari'+req.session.loggedIn);
													//ho trovato la pagina richiesta dall'utente
													//posso finalmente procedere a visualizzare la pagina
													
													//var pageController = require('../controllers/page');
													app.jsl.pageController.render( app, req, res, page );
													/* questo funzia
													res.render('debug', {
														layout: false, 
														variable: 'pagina: '+page.route+" del sito: "+site.domain
													});
													*/
												}
												else
												{
													app.jsl.utils.errorPage(res, err, "the page with route: '"+req.url+"' doesn't exist, or is private, on site: "+site.domain, 'layoutPopup');
													//non ho trovato la pagina, procedo, potrebbe essere stato richiesto un file statico
													//next();
												}
											}
											else
											{
												app.jsl.utils.errorPage(res, err, "error on query to find page: "+req.url, 'layoutPopup');
											}
										});							
								}
								else
								{
									app.jsl.utils.errorPage(res, err, "the site '"+req.headers.host+"' doesn't exist on this server, or is private", 'layoutPopup');
								}
							}
							else
							{
								app.jsl.utils.errorPage(res, err, "error on query to find site: "+req.headers.host, 'layoutPopup');
							}
						}
					);				
				////}
				//});
			}
		}
	}); 	
	
	
	
	
	
	
	//da qui in poi solo route del sito di admin
	
	
	//GET: home
	app.get('/', app.jsl.perm.readStrucPermDefault, function(req, res){ 
		app.jsl.routes.routeInit(req);
		res.render('home', {
		});
	});

	//POST: login signin
	app.post('/signin', function(req, res) {
		app.jsl.routes.routeInit(req);
		//controllo se esiste il mio utente nel db
		app.jsl.sess.checkValidUser(req, function(result, user_id) { 
			if ( result )
			{
				//ho trovato lo user nel db (oppure sono superadmin)
				//il login è valido
				app.jsl.sess.setSignedIn(req, user_id);
				console.log("POST: login signin: login succeded for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
			else
			{
				//il mio utente non c'è nel db
				app.jsl.sess.setSignedOut(req);
				console.log("POST: login signin: login failed for user: "+req.body.login_email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
		});	
	});
	
	//GET: login signout
	app.get('/signout', function(req, res) {
		app.jsl.routes.routeInit(req);
		//resetto le session
		console.log("POST: login signout: for user: "+req.session.email);
		app.jsl.sess.setSignedOut(req);
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
	//GET: change language
	app.get('/lan/:locale?', function(req, res) {
		app.jsl.routes.routeInit(req);
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
	
	//POST: qaptcha specific route
	app.post('/qaptcha', function(req, res) {
		app.jsl.routes.routeInit(req);
		console.log(req.body);
		var response = {};
		response['error'] = false;
			
		if(req.body.action && req.body.qaptcha_key)
		{
			req.session.qaptcha_key = false;	
			
			if(req.body.action == 'qaptcha')
			{
				req.session.qaptcha_key = req.body.qaptcha_key;
			}
			else
			{
				response['error'] = true;
			}
		}
		else
		{
			response['error'] = true;
		}
		res.json( response );
	});
	
	
	
	/*
	FILTERS
	nota: ora li tengo qui, ma se aumentano sarà meglio metterli, ove possibile, nei rispettivi controllers js
	*/
	
	//GET: list filter All or Mine
	app.get('/filterAllOrMine/:filterOn', function(req, res) {
		app.jsl.routes.routeInit(req);
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
		app.jsl.routes.routeInit(req);
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

	/*	
	//GET: filter by model
	//nota: se si passa anche il parametro andGotoUrl, questo deve essere URIencodato: in jade usare #{encURI('url')}
	app.get('/filterByModel/:jslModel?/:andGotoUrl?', function(req, res) {
		app.jsl.routes.routeInit(req);
		//prima definisco su che url fare il redirect
		var redirectTo = ( req.params.andGotoUrl != '' && req.params.andGotoUrl != undefined ) ? decodeURIComponent(req.params.andGotoUrl) : 'back';
		//inizialmente azzero la session per il filtraggio
		req.session.filterByModel = undefined;
		//verifico se mi è arrivato un jslModel su cui filtrare
		if ( req.params.jslModel != '' && req.params.jslModel != undefined )
		{
			//leggo i siti su cui posso filtrare, per verificare che l'utente stia cercando di filtrare su un sito a lui consentito
			app.jsl.jslModelController.getJslModels(req,res,function(jslModels) {
				if (jslModels)
				{
					//posso filtrare su dei jslModels. verifico se quello richiesto è tra quelli papabili
					//nota: non posso usare array.forEach perchè devo poter usare break;
					for (var x=0;x<jslModels.length;x++)
					{
						if ( jslModels[x]._id == req.params.jslModel )
						{
							//trovato il mio sito, posso usarlo per filtrare
							//imposto le session ed esco dal ciclo
							req.session.filterByModel = req.params.jslModel;
							break;
						}
					}
					//ricarico la pagina da cui arrivavo
					res.redirect(redirectTo);				
				}
				else
				{
					//se non mi sono arrivati jslModels, vuol dire che non posso filtrare su niente
					//ricarico la pagina da cui arrivavo
					res.redirect(redirectTo);				
				}
			});
		}
		else
		{
			//non mi è arrivato il jslModel, che vuol dire che non devo filtrare su nessun jslModel
			//ricarico la pagina da cui arrivavo
			res.redirect(redirectTo);
		}
	});
	*/

	
	
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




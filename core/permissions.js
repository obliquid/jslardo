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







//PERMISSIONS

//questi sono wrapper che mi servono per differenziare i permessi in base all'oggetto trattato

function readStrucPermOn_users(req, res, next) {
	readStrucPerm('user', req, res, next);
}
exports.readStrucPermOn_users = readStrucPermOn_users;


function readStrucPermDefault(req, res, next) {
	/*
	if ( req.session )
	{
		console.log('logeedzzzz?='+req.session.loggedIn);
	}
	else
	{
		console.log('undefined dddd'+req.headers.host+req.url);
	}
	*/
	readStrucPerm('default', req, res, next);
}
exports.readStrucPermDefault = readStrucPermDefault; 


//quando si assegnano i middleware alle routes, prima bisogna sempre leggere i permessi (readStrucPermOn_XXX)
//poi si possono imporre lecondizioni in base ai permessi (needStrucPermXXX)
function needStrucPermCreate(req, res, next) {
	( req.session.canCreate ) ? next() : res.redirect('/');
}
exports.needStrucPermCreate = needStrucPermCreate;


function needStrucPermModify(req, res, next) {
	( req.session.canModify ) ? next() : res.redirect('/');
}
exports.needStrucPermModify = needStrucPermModify;


function needStrucPermModifyMyself(req, res, next) {
	( req.session.canModifyMyself ) ? next() : res.redirect('/');
}
exports.needStrucPermModifyMyself = needStrucPermModifyMyself;


//mi aspetto che l'id sia definito in req.params.id
function needStrucPermModifyOnDivId(req, res, next) {
	checkElementAuthorship('div', req, res ,next);
}
exports.needStrucPermModifyOnDivId = needStrucPermModifyOnDivId;


function needStrucPermModifyOnModuleId(req, res, next) {
	checkElementAuthorship('module', req, res ,next);
}
exports.needStrucPermModifyOnModuleId = needStrucPermModifyOnModuleId;


function needStrucPermModifyOnPageId(req, res, next) {
	checkElementAuthorship('page', req, res ,next);
}
exports.needStrucPermModifyOnPageId = needStrucPermModifyOnPageId;


function needStrucPermModifyOnRoleId(req, res, next) {
	checkElementAuthorship('role', req, res ,next);
}
exports.needStrucPermModifyOnRoleId = needStrucPermModifyOnRoleId;


function needStrucPermModifyOnSiteId(req, res, next) {
	checkElementAuthorship('site', req, res ,next);
}
exports.needStrucPermModifyOnSiteId = needStrucPermModifyOnSiteId;

function needStrucPermModifyOnContentId(req, res, next) {
	checkElementAuthorship('content', req, res ,next);
}
exports.needStrucPermModifyOnContentId = needStrucPermModifyOnContentId;

function needStrucPermModifyOnJslModelId(req, res, next) {
	checkElementAuthorship('jslModel', req, res ,next);
}
exports.needStrucPermModifyOnJslModelId = needStrucPermModifyOnJslModelId;


function checkElementAuthorship(element, req, res, next) {
	//prima controllo se ho il permesso di modify o se sono superadmin
	if ( req.session.canModify ) {
		//console.log('ok, ho modify per '+element);
		//se sono superadmin ho modify a prescindere dall'id, quindi bypasso il controllo
		if ( req.session.user_id == 'superadmin' ) {
			//console.log('sono superadmin, quindi ho modify per tutti gli id ');
			next();
		} else {
			//se si tratta di un content, devo prima caricare il suo model mongoose
			if ( element == 'content' ) {
				//console.log(req.params.modelId);
				//l'id del model lo devo avere nelle sessions
				req.app.jsl.jslModelController.loadMongooseModelFromId(req.app, req.params.modelId, function(){
					go_on('jslmodel_'+req.params.modelId);
				});
			} else {
				go_on(element);
			}
			function go_on(element) {
				//poi controllo se sono author dell'elemento di cui mi stanno passando l'id
				req.app.jsl[element].findOne(
					{ '_id': req.params.id, 'author': req.session.user_id },
					function(err, result) {
						if (!err)
						{
							if ( result )
							{
								//return true;
								//console.log('ok, sono author di un '+element+' con id '+req.params.id);
								next();
							}
							else
							{
								//return false;
								//console.log('KO, NON sono author di un '+element+' con id '+req.params.id);
								res.redirect('/');
							}
						}
						else
						{
							//qualcosa è andato storto nella query
							req.app.jsl.utils.errorPage(res, err, 'permissions.checkElementAuthorship: error in query retrieving element');
						}
					}
				);
			}
		}
	} else {
		res.redirect('/');
	}
}

//questo metodo viene richiamato prima di eseguire ogni request che lo richiede
//in qualunque controller di qualunque oggetto
function readStrucPerm(on, req, res, next) {
	//console.log('readStrucPerm: req.session.user_id = ' + req.session.user_id);
	//solo nel caso di favicon.ico non ha le session impostate, non so perchè,
	//quindi bypasso il controllo, perchè su favicon non ho nessuna restrizione
	if ( !req.session )
	{
		next();
	}
	else
	{
		//azzero i permessi
		req.session.loggedIn = false;
		req.session.canCreate = false;
		req.session.canModify = false;
		req.session.canModifyMyself = false; //questo è un permesso che vale solo per l'elemento "users"
		//controllo se sono loggato
		if (req.session.user_id) {
			//l'utente risulta loggato
			//controllo se i suoi dati di login sono validi
			//(questo controllo va fatto ogni volta, perchè se dall'ultimo conrollo l'utente fosse stato cancellato, non me ne accorgerei senza controllo
			req.app.jsl.sess.checkValidUser(req, function(result, user_id) { 
				if ( result )
				{
					//i dati di login sono validi
					req.session.loggedIn = true;
					if ( user_id == 'superadmin' )
					{
						//se sono super admin, ho sempre permesso di modify su tutti i contenuti, ma non ho il create (a parte sugli users)
						//questo perchè quando si crea un contenuto, questo è strettamente legato all'utente che lo crea, e il superadmin
						//non è un utente vero è proprio (non è presente nel db, non ha id). il super admin serve solo per poter vedere e modificare tutto, ma non può creare nulla
						req.session.canModify = true;
						req.session.canModifyMyself = true; //questo serve per permettere al super admin di modificare gli utenti (il form di modifica lo richiede)
						//solo nel caso degli users, il superadmin ha il create, anche se usersCanRegister = false
						if ( on == 'user' )
						{
							req.session.canCreate = true;
						}
						//la request puo essere processata
						next();
					}
					else
					{
						//non sono superadmin
						//siccome si tratta di permessi su elementi della struttura, chiunque (loggato) ha sempre il permesso di create nuovi elementi
						//(tranne per il caso degli "user" in cui si creano altri utenti con il bottone "registrati", che però non prevede di essere loggati)
						if ( on != 'user' )
						{
							req.session.canCreate = true;
						}
						//differenzio i permessi di modify in base all'oggetto trattato
						switch (on)
						{
							case 'user':
								//user è un elemento della struttura particolare, perchè, a differenza di tutti gli altri elementi di struttura, ogni utente può solo modificare
								//se stesso. inoltre user non ha un "author" poichè un utente è creato da se stesso tramite il bottone "register"
								//nel caso di modifica di users, ho modify solo per modificare me stesso
								if ( req.params.id == req.session.user_id ) //controllo se l'id dell'utente da modificare è quello dell'utente loggato, cioè se modifico me stesso
								{
									//lo user id nella route richiesta corrisponde al mio, quindi posso modificare me stesso (il mio profilo)
									req.session.canModifyMyself = true; 
								}
								break;
							default:
								//ora come ora per tutti gli altri elementi della struttura chiunque ha permesso di modify, ma solo sui propri elementi
								req.session.canModify = true; 
								break;
						}
						//continuo
						next();
						
					}
				}
				else
				{
					//i dati di login non sono validi
					//console.log('readStrucPerm: login NON valido');
					//forzo un logout (potrebbe verificarsi il caso in cui un utente è loggato, e viene cancellato dal db. in quel caso deve avvenire anche il suo logout)
					setSignedOut(req);
					//vengo mandato in home
					res.redirect('/');
				}
			});
			
		} else {
			//console.log('readStrucPerm: utente non loggato');			
			//non sono loggato. l'unica cosa che posso fare è di registrarmi, ovvero creare un nuovo user
			//ma solo se è stato previsto nel config
			if ( on == 'user' && req.app.jsl.config.usersCanRegister )
			{
				req.session.canCreate = true;
			}
			//non ho nessun permesso, continuo
			next();
		}
	}
}








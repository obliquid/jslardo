/*
USER
*/

function defineRoutes(app) {

	//GET: user list
	//nota: per ora non richiede permessi, tutti possono visualizzare la lista utenti, in cui però compariranno solo gli utenti "public"
	app.get('/users/:page?', app.jsl.paginationInit, function(req, res, next){
		app.jsl.routeInit(req);
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli user dal db, e assegno il result al tpl
			//se sono superadmin vedo anche i non public
			//console.log(req.session.user_id);
			var conditions = ( req.session.user_id == 'superadmin' ) ? {} : { 'status': 'public' };
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jsl.user.count(
				conditions,
				function(err, total) {
					if ( !err )
					{
						//procedo col find paginato
						app.jsl.user.find(
							conditions,
							[], 
							{ 
								sort: ['name', 'descending'],
								skip: req.session.skip, 
								limit: req.session.limit 
							},
							function(err, users) {
								res.render('users/list', { 
									users: users,
									pagination: app.jsl.paginationDo(req, total, '/users/')
								});	
							}
						);	
					}
					else
					{
						app.jsl.errorPage(res, err, "GET: user list: failed query on db");
					}	
				}
			);
		}
		else
		{
			next();
		}
	});
	
	//GET: user detail 
	app.get('/users/:id', function(req, res, next){
		app.jsl.routeInit(req);
		//leggo il mio user dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non public
		var conditions = ( req.session.user_id == 'superadmin' ) ? { '_id': req.params.id } : { '_id': req.params.id,  'status': 'public' };
		app.jsl.user.findOne(
			conditions,
			[], 
			{},	
			function(err, user) {
				//console.log(user);
				if ( !err )
				{
					//la query può andare a buon fine anche se non esiste un utente col mio id e status: public,
					//in questo caso ritorna uno user null, quindi devo controllare se esiste lo user, altrimenti rimando in home
					if ( user )
					{
						res.render('users/detail', { 
							user: user
						});	
					}
					else
					{
						//non esiste un utente public col mio id, quindi torno in home
						app.jsl.errorPage(res, err, "GET: user detail: user not found");
					}
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: user detail: query error");
				}
			}
		);	
	});
	
	//GET: user register (new)
	//nota: qui avrei dovuto controllare s
	app.get('/users/edit/new', app.jsl.readStrucPermOn_users, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//è un NEW, renderizzo il form, ma senza popolarlo
		res.render('users/form', { 
			title: app.i18n.__('create new user'),
			user: ""
		});	
	});
	//POST: user form (new)
	//qui ci entro quando dal form faccio un submit ma non è definito l'id, altrimenti andrei nella route POST di modify
	app.post('/users/edit', app.jsl.readStrucPermOn_users, app.jsl.needStrucPermCreate, function(req, res, next){
		app.jsl.routeInit(req);
		//prima verifico se la email non è già stata usata
		app.jsl.user.findOne(
			{ 'email': req.body.email },
			function(err, user) {
				if ( user ) 
				{
					//email già usata
					app.jsl.errorPage(res, err, "already exists user with email: "+req.body.email);
				}
				else
				{
					//email libera
					//creo nuovo user
					var myUser = new app.jsl.user();
					//popolo il mio user con quanto mi arriva dal form
					app.jsl.populateModel(myUser, req.body);
					//inizializzo la data di creazione (che non è gestita dal form)
					myUser.created = new Date();
					//encripto la pw (lo faccio solo perchè è un new)
					myUser.password = app.jsl.hashPw(req, myUser.password);
					//elimino il campo retype_password che mi arriva dal form e che non voglio avere nel db
					delete myUser.retype_password;
					//salvo il nuovo user
					myUser.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio user nuovo
							//forzo il suo login per comodità
							//console.log("setSignedIn con req = "+req);
							//console.log("e con myUser.id = "+myUser.id);
							app.jsl.setSignedIn(req, myUser.id);
							//e rimando nel form
							res.redirect('/users/edit/'+myUser.id+'/success');
						}
						else
						{
							app.jsl.errorPage(res, err, "POST: user form: saving user: ");
						}
					});
				}
			}
		);	
	});	
	
	//GET: user form (modify) //quando entro in un form da un link (GET) e non ci arrivo dal suo stesso submit (caso POST)
	//nota che per gli user un utente può sempre e solo modificare se stesso (ModifyMyself), a differenza di tutti gli altri elementi
	//della struttura in cui un utente può modificare i suoi elementi (ModifyMine)
	app.get('/users/edit/:id/:msg?', app.jsl.readStrucPermOn_users, app.jsl.needStrucPermModifyMyself, function(req, res, next){
		app.jsl.routeInit(req);
		//mi hanno passato l'id obbligatoriamente
		//leggo il mio user dal db, e assegno il result al tpl
		app.jsl.user.findOne(
			{ '_id': req.params.id },
			function(err, user) {
				if (!err)
				{
					res.render('users/form', { 
						title: app.i18n.__('modify user'),
						user: user,
						msg: req.params.msg
					});	
				}
				else
				{
					app.jsl.errorPage(res, err, "GET: user form (modify): failed query on db");
				}	
					
			}
		);	
	});
	//POST: user form (modify)
	app.post('/users/edit/:id', app.jsl.readStrucPermOn_users, app.jsl.needStrucPermModifyMyself, function(req, res, next){
		app.jsl.routeInit(req);
		//prima trovo il mio user da modificare nel db
		app.jsl.user.findOne(
			{ '_id': req.params.id },
			function(err, user) {
				if (!err)
				{
					//ho trovato lo user da modificare
					//prima di popolare lo user controllo che, se l'utente sta cambiando email, non scelga un'email già usata
					//(in patica cerco uno user che abbia la mia stessa email, ma un id differente: se lo trovo, vuol dire che la mail è già stata usata)
					app.jsl.user.findOne(
						{ 'email': req.body.email, '_id': { $ne : req.body.id } },
						function(err, userSameMail) {
							if ( userSameMail ) 
							{
								//email già usata
								app.jsl.errorPage(res, err, "already exists user with email: "+req.body.email);
							}
							else
							{
								//la nuova email è valida, posso procedere
								//popolo il mio user con quanto mi arriva dal form
								app.jsl.populateModel(user, req.body);
								//se mi arriva una password vuota, non devo salvarla. la salvo solo se non è vuota, perchè è l'utente che sta impostando una nuova password
								if ( typeof user.new_password !== "undefined" && user.new_password != '' )
								{
									//encripto la pw
									user.password = app.jsl.hashPw(req, user.new_password);
								}
								//elimino property che arrivano dal form ma che non voglio finiscano nel db
								delete user.new_password; 
								delete user.retype_new_password; 
								
								//salvo lo user modificato e rimando nel form
								user.save(function(err) {
									res.redirect('/users/edit/'+user.id+'/success');
								});
							}
						}
					);
				}
				else
				{
					app.jsl.errorPage(res, err, "POST: user form (modify): user not found on db");
				}
			}
		);
	});
	
	//GET: user delete
	app.get('/users/delete/:id?', app.jsl.readStrucPermOn_users, app.jsl.needStrucPermModifyMine, function(req, res, next){
		app.jsl.routeInit(req);
		//do per scontato che mi hanno passato l'id, altrimenti needStrucPermModifyMine fallirebbe e non potrei entrare in questa route
		//cancello l'utente
		app.jsl.user.remove(
			{ '_id': req.params.id },
			function(err, user) {
				if ( err ) app.jsl.errorPage(res, err, 'GET: user delete: failed query on db');
			}
		);
		//QUI!!!: oltre all'utente, vanno cancellati anche tutti i suoi contenuti. aggiornare la lista dei delete man mano che si creano nuovi elementi della struttura o dei contenuti
		//faccio un redirect sulla lista
		res.redirect('/users');
	});
		
	
}

exports.defineRoutes = defineRoutes; 

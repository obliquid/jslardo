/*
USER
*/

function defineRoutes(app) {

	//GET: user list
	//nota: per ora non richiede permessi, tutti possono visualizzare la lista utenti, in cui però compariranno solo gli utenti "public"
	app.get('/users/:page?', app.jslardo.paginationInit, function(req, res, next){
		console.log("route matched: GET /users/:page?");
		if ( req.params.page == undefined || !isNaN(req.params.page) )
		{
			//leggo gli user dal db, e assegno il result al tpl
			//se sono superadmin vedo anche i non public
			//console.log(req.session.user_id);
			if ( req.session.user_id == 'superadmin' )
			{
				var conditions = {}
			}
			else
			{
				var conditions = { 'status': 'public' }
			}
			//per via della paginazione, ogni query di list va preceduta da una query di count
			app.jslardo.user.count(
				conditions,
				function(err, total) {
					//procedo col find paginato
					app.jslardo.user.find(
						conditions,
						[], 
						{ 
							sort: ['name', 'descending'],
							skip: req.session.skip, 
							limit: req.session.limit 
						},
						function(err, user) {
							res.render('users/list', { 
								user: user,
								mode: req.params.mode,
								pagination: app.jslardo.paginationDo(req, total, '/users/')
							});	
						}
					);	
				}
			);
		}
		else
		{
			next();
		}
	});
	//GET: user delete
	app.get('/users/delete/:id?', app.jslardo.checkPermissions, function(req, res, next){
		console.log("route matched: GET /users/delete/:id?");
		if (req.params.id) {
			//mi hanno passato l'id, quindi posso fare il delete
			app.jslardo.user.remove(
				{ '_id': req.params.id },
				function(err, user) {
					if ( err ) app.jslardo.errorPage(res, err, 'GET: user delete: ');
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi non posso fare il delete
		}
		//faccio un redirect sulla lista
		res.redirect('/users');
	});
	//GET: user register (new)
	app.get('/users/edit/new', function(req, res, next){
		console.log("route matched: GET /users/edit/new");
		//non mi hanno passato l'id, quindi è un NEW
		//faccio un redirect sul form, ma senza popolarlo
		res.render('users/form', { 
			title: app.i18n.__('create new user'),
			user: ""
		});	
	});
	//GET: user form (modify/new) //quando entro in un form da un link e non ci arrivo dal suo stesso submit
	app.get('/users/edit/:id?/:msg?', app.jslardo.checkPermissions, function(req, res, next){
		console.log("route matched: GET /users/edit/:id?/:msg?");
		if (req.params.id) {
			//mi hanno passato l'id, quindi è un MODIFY
			//leggo il mio user dal db, e assegno il result al tpl
			app.jslardo.user.findOne(
				{ '_id': req.params.id },
				function(err, user) {
					res.render('users/form', { 
						title: app.i18n.__('modify user'),
						user: user,
						msg: req.params.msg
					});	
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi è un NEW
			//faccio un redirect sul form, ma senza popolarlo
			res.render('users/form', { 
				title: app.i18n.__('create new user'),
				user: ""
			});	
		}
	});
	//POST: user form (modify)
	app.post('/users/:id', app.jslardo.checkPermissions, function(req, res, next){
		console.log("route matched: POST /users/:id");
		//console.log("req.params.id = "+req.params.id);
		//mi hanno passato l'id, quindi devo fare un MODIFY
		//ovvero un update del mio user nel db
		app.jslardo.user.findOne(
			{ '_id': req.params.id },
			function(err, user) {
				if (!err)
				{
					//ho trovato lo user da modificare
					//prima di popolare lo user controllo che, se l'utente sta cambiando email, non scelga un'email già usata
					app.jslardo.user.findOne(
						{ 'email': req.body.email, '_id': { $ne : req.body.id } },
						function(err, userSameMail) {
							if ( userSameMail ) 
							{
								//email già usata
								app.jslardo.errorPage(res, err, "already exists user with email: "+req.body.email);
							}
							else
							{
								//la nuova email è valida, posso procedere
								//popolo il mio user con quanto mi arriva dal form
								app.jslardo.populateModel(user, req.body);
								//console.log('sto per modificare uno user con pw='+user.password);
								//se mi arriva una password vuota, non devo salvarla. la salvo solo se non è vuota, perchè è l'utente che sta impostando una nuova password
								if ( typeof user.new_password !== "undefined" && user.new_password != '' )
								{
									//encripto la pw
									user.password = app.jslardo.hashPw(req, user.new_password);
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
					app.jslardo.errorPage(res, err, "POST: user form: user not saved: ");
				}
			}
		);
	});
	//POST: user form (new)
	app.post('/users', function(req, res, next){
		console.log("route matched: POST /users");
		//console.log("NO req.params.id ");
		//non mi hanno passato l'id, quindi devo fare un NEW
		//prima verifico se la email non è già stata usata
		app.jslardo.user.findOne(
			{ 'email': req.body.email },
			function(err, user) {
				if ( user ) 
				{
					//email già usata
					app.jslardo.errorPage(res, err, "already exists user with email: "+req.body.email);
				}
				else
				{
					//email libera
					//creo nuovo user
					var myUser = new app.jslardo.user();
					//popolo il mio user con quanto mi arriva dal form
					app.jslardo.populateModel(myUser, req.body);
					//inizializzo la data di creazione (che non è presente nel form)
					myUser.created = new Date();
					//encripto la pw (lo faccio solo perchè è un new)
					myUser.password = app.jslardo.hashPw(req, myUser.password);
					//elimino il campo retype_password che mi arriva cmq dal form
					delete myUser.retype_password;
					//console.log('sto per creare uno user con pw='+myUser.password);
					//salvo il nuovo user
					myUser.save(function (err) {
						if (!err) 
						{
							//ho creato con successo il mio user nuovo
							//forzo il suo login per comodità
							//console.log("setSignedIn con req = "+req);
							//console.log("e con myUser.id = "+myUser.id);
							app.jslardo.setSignedIn(req, myUser.id);
							//e rimando nel form
							res.redirect('/users/edit/'+myUser.id+'/success');
						}
						else
						{
							app.jslardo.errorPage(res, err, "POST: user form: saving user: ");
						}
					});
				}
			}
		);	
	});
	//GET: user detail 
	//nota1: deve andare dopo il 'GET: user form' (/users/edit/:id?), altrimenti quando creo un nuovo user (/users/edit) mi entra nel detail prendendo 'edit' per un id
	app.get('/users/:id', function(req, res, next){
		console.log("route matched: GET /users/:id");
		//leggo il mio user dal db, e assegno il result al tpl
		//se sono superadmin vedo anche i non public
		if ( req.session.user_id == 'superadmin' )
		{
			var conditions = { '_id': req.params.id }
		}
		else
		{
			var conditions = { '_id': req.params.id,  'status': 'public' }
		}
		app.jslardo.user.findOne(
			conditions,
			[], 
			{ sort: ['email', 'descending'] },	
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
						//vengo mandato in home
						res.redirect('/');						
					}
				}
				else
				{
					app.jslardo.errorPage(res, err, "GET: user detail: error loading user: ");
				}
			}
		);	
	});
	
}

exports.defineRoutes = defineRoutes; 

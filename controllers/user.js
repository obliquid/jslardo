/*
USER
*/

function defineRoutes(app) {

	//GET: user list
	app.get('/users/:mode?', app.jslardo.checkPermissions, function(req, res, next){
		//console.log("ccccc! "+req.params.mode);
		if ( req.params.mode == undefined || req.params.mode == 'select' )
		{
			//leggo gli user dal db, e assegno il result al tpl
			app.user.find(
				{},
				[], 
				{ sort: ['nome', 'descending'] },	
				function(err, user) {
					res.render('users/list', { 
						title: 'all users',
						user: user,
						mode: req.params.mode
					});	
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
		if (req.params.id) {
			//mi hanno passato l'id, quindi posso fare il delete
			app.user.remove(
				{ '_id': req.params.id },
				function(err, user) {
					if ( err ) app.jslardo.errorPage(res, 'GET: user delete: '+err);
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi non posso fare il delete
		}
		//faccio un redirect sulla lista
		res.redirect('/users');
	});
	//GET: user form (modify/new)
	app.get('/users/edit/:id?/:msg?', app.jslardo.checkPermissions, function(req, res, next){
		if (req.params.id) {
			//mi hanno passato l'id, quindi è un MODIFY
			//leggo il mio user dal db, e assegno il result al tpl
			app.user.findOne(
				{ '_id': req.params.id },
				function(err, user) {
					res.render('users/form', { 
						title: 'modify user',
						user: user,
						msg: req.params.msg
					});	
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi è un NEW
			//faccio un redirect sul form, ma senza popolarlo
			res.render('users/form', { 
				title: 'create new user',
				user: ""
			});	
		}
	});
	//POST: user form (modify/new)
	app.post('/users/:id?', function(req, res, next){
		if (req.params.id) {
			//mi hanno passato l'id, quindi devo fare un MODIFY
			//update del mio user nel db
			app.user.findOne(
				{ '_id': req.body.id },
				function(err, user) {
					if (!err)
					{
						//ho trovato lo user da modificare
						//popolo il mio user con quanto mi arriva dal form
						app.jslardo.populateModel(user, req.body);
						//salvo lo user modificato
						//e rimando nel form
						user.save(function(err) {
							res.redirect('/users/edit/'+user.id+'/success');
						});
					}
					else
					{
						app.jslardo.errorPage(res, "POST: user form: user not saved: "+err);
					}
				}
			);
		} else {
			//non mi hanno passato l'id, quindi devo fare un NEW
			//prima verifico se la email non è già stata usata
			app.user.findOne(
				{ 'email': req.body.email },
				function(err, user) {
					if ( user ) 
					{
						//email già usata
						app.jslardo.errorPage(res, "POST: user form: already exists user with email: "+req.body.email);
					}
					else
					{
						//email libera
						//creo nuovo user
						var myUser = new app.user();
						//popolo il mio user con quanto mi arriva dal form
						app.jslardo.populateModel(myUser, req.body);
						//salvo il nuovo user
						myUser.save(function (err) {
							if (!err) 
							{
								//ho creato con successo il mio user nuovo
								//e rimando nel form
								res.redirect('/users/edit/'+myUser.id+'/success');
							}
							else
							{
								app.jslardo.errorPage(res, "POST: user form: saving user: "+err);
							}
						});
					}
				}
			);	
		}
	});
	//GET: user detail (deve andare dopo il 'GET: user form' (/users/edit/:id?), altrimenti quando creo un nuovo user (/users/edit) mi entra nel detail prendendo 'edit' per un id)
	app.get('/users/:id?', app.jslardo.checkPermissions, function(req, res, next){
		//console.log("ccccc!");
		if (req.params.id) {
			//app.jslardo.errorPage(res, "ci passo?");
			//leggo il mio user dal db, e assegno il result al tpl
			app.user.findOne(
				{ '_id': req.params.id },
				[], 
				{ sort: ['email', 'descending'] },	
				function(err, user) {
					if ( !err )
					{
						res.render('users/detail', { 
							title: 'user detail',
							user: user
						});	
					}
					else
					{
						app.jslardo.errorPage(res, "GET: user detail: error loading user: "+err);
					}
				}
			);	
			
		} else {
			next();
		}
	});
	
}

exports.defineRoutes = defineRoutes; 

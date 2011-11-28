/*
PROJECT
*/

function defineRoutes(app) {

	//GET: project list
	app.get('/projects', app.jslardo.checkPermissions, function(req, res){
		//leggo gli project dal db, e assegno il result al tpl
		app.project.find(
			{},
			[], 
			{ sort: ['nome', 'descending'] },	
			function(err, project) {
				res.render('projects/list', { 
					title: 'all projects',
					project: project
				});	
			}
		);	
		
	});
	//GET: project delete
	app.get('/projects/delete/:id?', app.jslardo.checkPermissions, function(req, res, next){
		if (req.params.id) {
			//mi hanno passato l'id, quindi posso fare il delete
			app.project.remove(
				{ '_id': req.params.id },
				function(err, project) {
					if ( err ) app.jslardo.errorPage(res, 'GET: project delete: '+err);
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi non posso fare il delete
		}
		//faccio un redirect sulla lista
		res.redirect('/projects');
	});
	//GET: project form (modify/new)
	app.get('/projects/edit/:id?/:msg?', app.jslardo.checkPermissions, function(req, res, next){
		if (req.params.id) {
			//mi hanno passato l'id, quindi è un MODIFY
			//leggo il mio project dal db, e assegno il result al tpl
			app.project.findOne(
				{ '_id': req.params.id },
				function(err, project) {
					res.render('projects/form', { 
						title: 'modify project',
						project: project,
						msg: req.params.msg
					});	
				}
			);	
			
		} else {
			//non mi hanno passato l'id, quindi è un NEW
			//faccio un redirect sul form, ma senza popolarlo
			res.render('projects/form', { 
				title: 'create new project',
				project: ""
			});	
		}
	});
	//POST: project form (modify/new)
	app.post('/projects/:id?', function(req, res, next){
		if (req.params.id) {
			//mi hanno passato l'id, quindi devo fare un MODIFY
			//update del mio project nel db
			app.project.findOne(
				{ '_id': req.body.id },
				function(err, project) {
					if (!err)
					{
						//ho trovato lo project da modificare
						//popolo il mio project con quanto mi arriva dal form
						app.jslardo.populateModel(project, req.body);
						//salvo lo project modificato
						//e rimando nel form
						project.save(function(err) {
							res.redirect('/projects/edit/'+project.id+'/success');
						});
					}
					else
					{
						app.jslardo.errorPage(res, "POST: project form: project not saved: "+err);
					}
				}
			);
		} else {
			//non mi hanno passato l'id, quindi devo fare un NEW
			//creo nuovo project
			var myProject = new app.project();
			//popolo il mio project con quanto mi arriva dal form
			app.jslardo.populateModel(myProject, req.body);
			//salvo il nuovo project
			myProject.save(function (err) {
				if (!err) 
				{
					//ho creato con successo il mio project nuovo
					//e rimando nel form
					res.redirect('/projects/edit/'+myProject.id+'/success');
				}
				else
				{
					app.jslardo.errorPage(res, "POST: project form: saving project: "+err);
				}
			});
		}
	});
	//GET: project detail (deve andare dopo il 'GET: project form' (/projects/edit/:id?), altrimenti quando creo un nuovo project (/projects/edit) mi entra nel detail prendendo 'edit' per un id)
	app.get('/projects/:id?', app.jslardo.checkPermissions, function(req, res, next){
		if (req.params.id) {
			//leggo il mio project dal db, e assegno il result al tpl
			app.project.findOne(
				{ '_id': req.params.id },
				[], 
				{ sort: ['name', 'descending'] },	
				function(err, project) {
					if ( !err )
					{
						res.render('projects/detail', { 
							title: 'project detail',
							project: project
						});	
					}
					else
					{
						app.jslardo.errorPage(res, "GET: project detail: error loading project: "+err);
					}
				}
			);	
			
		} else {
			next();
		}
	});
	
}

exports.defineRoutes = defineRoutes; 

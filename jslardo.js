// jslardo functions


//SESSIONS
/* controllo nel db se lo user (che sia in POST o dalle sessions) esiste */
function checkValidUser(req, closure)
{
	//controllo se ho le credenziali in POST (cioè se sto facendo un login dal form), oppure se le ho nelle session (sono già loggato)
	var email = ( req.body && req.body.email && req.body.email != "" ) ? req.body.email : req.session.email;
	var password = ( req.body && req.body.password && req.body.password != "" ) ? req.body.password : req.session.password;
	
	//verifico se effettivamente esiste nel db il mio utente
	req.app.user.findOne(
		{ 'email': email, 'password': password },
		function(err, user) {
			if (!err)
			{
				if ( user && user.email == email && user.password == password )
				{
					//return true;
					closure(true);
				}
				else
				{
					//return false;
					closure(false);
				}
			}
			else
			{
				//qualcosa è andato storto nella query
				errorPage(res, 'jslardo.checkValidUser: '+err);
			}
		}
	);		
	
}

/* dopo che è stato effettuato il controllo, questo metodo salva effettivamente le variabili che dicono che l'utente è loggato */
function setSignedIn(req)
{
	//salvo nelle session che il mio utente è loggato
	req.session.email = req.body.email;
	req.session.password = req.body.password;
	req.session.signedin = true;
}

/* slogga l'utente */
function setSignedOut(req)
{
	//resetto le session
	req.session.destroy(function() {});
}



//PERMISSIONS
//questo metodo viene richiamato prima di eseguire ogni request che lo richiede
//in qualunque controller di qualunque oggetto
function checkPermissions(req, res, next) {
	//controllo i permessi
	if (req.session.signedin) {
		//l'utente risulta loggato
		//controllo se i suoi dati di login sono validi
		checkValidUser(req, function(result) { 
			if ( result )
			{
				//i dati di login sono validi
				//ora come ora gestisco un permesso unico per tutti gli utenti loggati, ma in futuro dovrò differenziare in base a ruoli/permessi
				req.session.hasModify = true; //questo perloppiù lo uso nei template
				//la request puo essere processata
				next();
			}
			else
			{
				//i dati di login non sono validi
				//forzo un logout (potrebbe verificarsi il caso in cui un utente è loggato, e viene cancellato dal db. in quel caso deve avvenire anche ilsuo logout
				setSignedOut(req);
				//vengo mandato in home
				res.redirect('/');
			}
		});
		
	} else {
		//se l'utente non è loggato, lo rimando nella home
		res.redirect('/');
	}
}




// VARIE

/* visualizza una pagina di errore e logga sulla console */
function errorPage(res, errMsg) {
	console.log(errMsg);
	res.render('error', { 
		title: 'jslardo error!',
		errMsg: errMsg
	});			
}

/* carica le routes per le pagine interne di jslardo */
function defineRoutes(app) {
	
	//GET: home
	app.get('/', function(req, res){ 
		res.render('home', {
			title: 'jslardo'
		});
	});

	//POST: login signin
	app.post('/signin', function(req, res) {
		//controllo se esiste il mio utente nel db
		checkValidUser(req, function(result) { 
			if ( result )
			{
				//ho trovato lo user nel db
				//il login è valido
				setSignedIn(req);
				console.log("POST: login signin: login succeded for user: "+req.body.email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
			else
			{
				//il mio utente non c'è nel db
				setSignedOut(req);
				console.log("POST: login signin: login failed for user: "+req.body.email);
				//alla fine ricarico la pagina da cui arrivavo
				res.redirect('back');
			}
		});	
	});
	
	//GET: login signout
	app.get('/signout', function(req, res) {
		//resetto le session
		console.log("POST: login signout: for user: "+req.session.email);
		req.session.destroy(function() {});
		//alla fine ricarico la pagina da cui arrivavo
		res.redirect('back');
	});
	
}

/* carica la route di default da usare quando nessuna altra route è stata matchata */
//non va
function defineRoute404(app) {
	/*
	app.get('*', function(req, res){
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
	//ciclo su tutte le property che mi arrivano in modelData (le dovrò replicare in model)
	for(var prop in modelData) {
		if(modelData.hasOwnProperty(prop))
		{
			//assegno a model la mia property, ma solo se non si tratta dell'id
			if( prop != "id" )
			{
				model[prop] = modelData[prop];
			}
		}
	}		
	
}



exports.defineRoutes = defineRoutes; 
exports.defineRoute404 = defineRoute404; 
exports.errorPage = errorPage; 
exports.populateModel = populateModel; 
exports.checkPermissions = checkPermissions; 
exports.checkValidUser = checkValidUser; 




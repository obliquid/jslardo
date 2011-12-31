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




//SESSIONS
/* controllo nel db se lo user (che sia in POST o dalle sessions) esiste */
function checkValidUser(req, closure)
{
	//console.log('checkValidUser: req.body.login_email='+req.body.login_email);
	//controllo se ho le credenziali in POST (cioè se sto facendo un login dal form), oppure se le ho nelle session (sono già loggato)
	var email = ( req.body && req.body.login_email && req.body.login_email != "" ) ? req.body.login_email : req.session.email;
	var password = ( req.body && req.body.login_password && req.body.login_password != "" ) ? req.body.login_password : req.session.password;
	//prima controllo se si tratta del super admin
	if ( req.app.jsl.config.superadminEmail == email && req.app.jsl.config.superadminPw == password )
	{
		closure(true, 'superadmin'); //se sono super user, salvo come id la parola "superadmin"
	}
	else
	{
		//verifico se effettivamente esiste nel db il mio utente
		var hashedPw = hashPw(req, password);
		//console.log("checkValidUser: hashedPw="+hashedPw);
		req.app.jsl.user.findOne(
			{ 'email': email, 'password': hashedPw },
			function(err, user) {
				if (!err)
				{
					if ( user && user.email == email && user.password == hashedPw )
					{
						//return true;
						closure(true, user._id);
					}
					else
					{
						//return false;
						closure(false, 0);
					}
				}
				else
				{
					//qualcosa è andato storto nella query
					errorPage(res, err, 'jslardo.checkValidUser: error in query retrieving users');
				}
			}
		);		
	}
}

/* dopo che è stato effettuato il controllo, questo metodo salva effettivamente le variabili che dicono che l'utente è loggato */
function setSignedIn(req, user_id)
{
	//devo considerare i casi in cui i dati arrivano dal form di login, e il caso in cui arrivano dal form di modifica dell'utente
	if ( req.body && req.body.login_email && req.body.login_email != "" ) 
	{
		var email = req.body.login_email;
	}
	else if ( req.body && req.body.email && req.body.email != "" ) 
	{
		var email = req.body.email;
	}
	if ( req.body && req.body.login_password && req.body.login_password != "" ) 
	{
		var password = req.body.login_password;
	}
	else if ( req.body && req.body.password && req.body.password != "" ) 
	{
		var password = req.body.password;
	}
	//salvo nelle session che il mio utente è loggato
	req.session.email = email;
	req.session.password = password;
	req.session.user_id = user_id; //questo varrà 'superadmin' se mi sono loggato come superadmin
	//by default quando un utente si logga, vedrà solo i suoi elementi, ma solo se non è superadmin
	if ( user_id != 'superadmin' )
	{
		req.session.filterAllOrMine = 'mine';
	}
}

/* slogga l'utente */
function setSignedOut(req)
{
	//resetto le session
	req.session.destroy(function() {});
}

/* hashing delle password */
function hashPw(req, password)
{
	return req.app.jsl.crypto.createHash('sha1').update(password).digest('hex');
}




exports.setSignedIn = setSignedIn; 
exports.setSignedOut = setSignedOut; 
exports.checkValidUser = checkValidUser; 
exports.hashPw = hashPw; 




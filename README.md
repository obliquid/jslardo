# jslardo

## what is this?
jslardo is a sort of a social cms, based on node.js and mongodb.
users are able to register to the application, create their own models (mongoose schemas), views, controllers, websites and pages. all management is done without writing code, and all user contents (the data, but also models/views and controllers) are shareable between registered users.
NOTE: jslardo is on heavy development, keep updated frequently and be patient with bugs and not yet implemented functionalities.

## it's based upon?
jslardo starts as a node.js express application, backed up by mongodb with mongoose.
as a template engine jslardo internally uses jade.

## yet implemented functionalities
  - internationalization:
    - via i18n
  - sites management
  - pages management
  - divs management
  - models (schemas) management
    - runtime mongoose models reload at each change
	- fielads can also be DBRefs to other models created by users (array or single value fields supported)
	- automatic update of contents and schemas at each user interaction to maintain full coherence in database
  - contents management
    - with automatic form generation
  - users management
    - users can register, and modify their profile

## try it
we have an installation of jslardo that should be aligned to master repository revision: http://weadmin.it/
(to create contents you must first register)

## installation
see the wiki page for some more info. but, if you have node and npm already working, installing jslardo is as easy as
```
npm install jslardo -g
```

## license
Copyright (C) 2011 Federico Carrara (federico@obliquid.it)

For more information on our agency: http://obliquid.org/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.





## finally, the name, why lardo?
because lardo is good

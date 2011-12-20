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








//PAGINATION
function paginationInit(req, res, next) {
	//numero di pagina corrente
	req.session.pageNum = parseInt(req.params.page) || 1;
	//skip
	req.session.skip = req.app.jsl.config.elementsPerPage * ( req.session.pageNum - 1 );
	//limit
	req.session.limit = req.app.jsl.config.elementsPerPage;
	//la request puo essere processata
	next();

}
function paginationDo(req, total, url) {
	//actual range
	var recordsPerPage = req.app.jsl.config.elementsPerPage;
	var usePagination = ( total > recordsPerPage ) ? true : false;
	if ( usePagination )
	{
		var endToRecord = req.session.pageNum * recordsPerPage;
		if( endToRecord > total )
		{
			endToRecord = total;
		}
		var endFromRecord = ((req.session.pageNum-1) * recordsPerPage) +1;
		if ( total > recordsPerPage )
		{
			var currentRangeString = endFromRecord+" - "+endToRecord+" ( tot. "+total+" )";
		}
		//first range - first page link
		if (req.session.pageNum > 1)
		{
			var firstRangeString = "1 - "+recordsPerPage+" ( tot. "+total+" )";
		}
		// prev 10 pages link
		if (req.session.pageNum > 10)
		{
			var prev10LinkPage = req.session.pageNum - 10;
			var prev10RangeFromRecord = ((req.session.pageNum-11) * recordsPerPage) +1;
			var prev10RangeToRecord = ((req.session.pageNum-10) * recordsPerPage);
			var prev10RangeString = prev10RangeFromRecord+" - "+prev10RangeToRecord+" ( tot. "+total+" )";
		}
		//prev page link
		if (req.session.pageNum > 1)
		{
			var prevLinkPage = req.session.pageNum - 1;
			var prevRangeFromRecord = ((req.session.pageNum-2) * recordsPerPage) +1;
			var prevRangeToRecord = ((req.session.pageNum-1) * recordsPerPage);
			var prevRangeString = prevRangeFromRecord+" - "+prevRangeToRecord+" ( tot. "+total+" )";
		}
		//next page link
		var nextTempVar = (recordsPerPage * req.session.pageNum)+1;
		if (nextTempVar <= total)
		{
			var nextLinkPage = req.session.pageNum + 1;
			var nextRangeFromRecord = (req.session.pageNum * recordsPerPage) +1;
			var nextRangeToRecord = ((req.session.pageNum+1) * recordsPerPage);
			if ( nextRangeToRecord > total)
			{
				 nextRangeToRecord = total;
			}
			var nextRangeString = nextRangeFromRecord+" - "+nextRangeToRecord+" ( tot. "+total+" )";
		}
		//next 10 pages link
		var next10TempVar = (recordsPerPage * (req.session.pageNum + 9)) + 1;
		if (next10TempVar <= total)
		{
			var next10LinkPage = req.session.pageNum + 10;
			var next10RangeFromRecord = (( req.session.pageNum + 9 ) * recordsPerPage) + 1;
			var next10RangeToRecord = ((req.session.pageNum + 10) * recordsPerPage);
			if ( next10RangeToRecord > total)
			{
				 next10RangeToRecord = total;
			}
			var next10RangeString = next10RangeFromRecord+" - "+next10RangeToRecord+" ( tot. "+total+" )";
		}
		//last page link
		if (req.session.pageNum < Math.floor(( total - 1 )/recordsPerPage)+1)
		{
			var lastLinkPage = Math.floor(( total - 1 )/recordsPerPage)+1;
			var lastRangeFromRecord = Math.floor(( total-1 ) / recordsPerPage);
			var lastRangeFromRecord = (lastRangeFromRecord * recordsPerPage) +1;
			var lastRangeToRecord = total;
			var lastRangeString = lastRangeFromRecord+" - "+lastRangeToRecord+" ( tot. "+total+" )";
		}
		return {
			firstBtn: { link:url+'1', tooltip:firstRangeString},
			prev10Btn: { link:url+prev10LinkPage, tooltip:prev10RangeString},
			prevBtn: { link:url+prevLinkPage, tooltip:prevRangeString},
			currentLabel: { link:url+req.session.pageNum, tooltip:currentRangeString},
			nextBtn: { link:url+nextLinkPage, tooltip:nextRangeString},
			next10Btn: { link:url+next10LinkPage, tooltip:next10RangeString},
			lastBtn: { link:url+lastLinkPage, tooltip:lastRangeString},
			usePagination: usePagination
		}
	}
	else
	{
		return {
			usePagination: usePagination
		}
	}
}

	

exports.paginationInit = paginationInit; 
exports.paginationDo = paginationDo; 



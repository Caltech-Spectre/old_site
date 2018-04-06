//contains all the books you've currently loaded
var list_of_all_books = [];

//just some starting filter text
var filter_text_no_one_will_search="This is filter text no one will search!";

//filter text: this is what you type in the search bar
var stored_filter_text = filter_text_no_one_will_search;

//javascript provides an array sort method that takes as input a function that can compare two object in an array. this is the one we're currently using to sort the page. It initializes to sort by author.
var stored_sort_by=sortBooksByAuthor;

//the server is limited. we can only load about 1000 books at once before it starts to complain.
var limitOfBooksToLoadAtOnce = 1000;

//if you initialize a new search while an old one is still loading, you don't want the old results mixing with the new. To prevent this, every search has a new request number, which is sent with the search to the server, and the server echos it in the response. results are loaded only if their echoed number matches the current request number
var requestNumber=0;

//the id of the user using this page. It is set on the main page itself, as this page is not actually processed on the server.
var userid = 0;

/**
call this function to execute a search for filterText.

It will reset the global stored filter text to the one you put in, and call get_books_from_server with the book xml search url, and the appropriate arguments.
**/
function update_search_books(filterText)
{
	stored_filter_text = filterText;
	get_books_from_server("/spectre/book/search/xml/", "filter="+stored_filter_text)
}

/**
call this with a url and arguments to send to it, and it will load all the books that returns in xml and put them in the page.

It firsts asks the server how many books match that search, and them asks it for them in requests of limitOfBooksToLoadAtOnce books each, as more than that might crash the server. Each request is asyncronous, so the server responds when it's ready, and when it does, add_books_to_list processes the xml returned

by the way, to keep new results from being contaminated by old searches still returning from the server, calling this raises requestNumber, and requestNumber is eched by the server with each request, so it can check to see if each result is from a current request.

It also blanks the current displayed list of books.
**/
function get_books_from_server(urlString,argumentString)
{
	requestNumber++;
	list_of_all_books = [];
	max_books = parseInt(loadText("/spectre/book/search/count/",argumentString));
	document.getElementById("numberofbookstoload").innerHTML = max_books;
	document.getElementById("numberofentries").innerHTML = "0";
	b=0;
	if (max_books > 0)
	{
		for (b=0; b<max_books; b = b + limitOfBooksToLoadAtOnce)
		{
			loadXML(urlString, "echo="+requestNumber+"&min_num="+b+"&max_num="+(b+limitOfBooksToLoadAtOnce)+"&"+argumentString, (function(books)
			{
				if (parseInt(books.getElementsByTagName("echo")[0].childNodes[0].nodeValue)==requestNumber)
				{
					add_books_to_list(books);
				}
			}));
		}
	}
	showBooks();
	return false;
}

/**
when given an xml representation of a list of books, this function adds books to the stored list, and displays them on the page.
**/
function add_books_to_list(books)
{
	books = books.getElementsByTagName("b");
	var i = 0;
	for(i = 0; i < books.length; i++)
	{
		list_of_all_books.push(new Book(books[i]));
	}
	list_of_all_books.sort(sortBooksByAuthor);
	document.getElementById("numberofentries").innerHTML = list_of_all_books.length;
	showBooks();
}

/**
sorts the whole stored list of books, given a function that can compare two books
**/
function sortBooks(sortBy)
{
	stored_sort_by=sortBy;
	showBooks();
}

/**
displays all the books in the main table.
**/
function showBooks()
{
	list_of_all_books.sort(stored_sort_by);
	document.getElementById("booktable").innerHTML = ""+
	"<tr class=\"header\">\n"+
"				<th width=\"12%\"></th>\n"+
"				<th width=\"10%\"></th>\n"+
"				<th width=\"10%\"></th>\n"+
"				<th width=\"25%\"></th>\n"+
"				<th width=\"38%\"></th>\n"+
"				<th width=\"5%\"></th>\n"+
"			</tr>"+
	displayBooks(list_of_all_books);//(filterBooks(list_of_all_books, stored_filter_text));
}


/**
Displays a book in the upper right corner. It actually requests detailed information on the book from the server, and when the server returns, it displays the results.
**/
function displayBook(spectre_id, args)
{
	loadXML("/spectre/book/"+spectre_id+"/xml/", args, function(bookXML){
		book = new Book(bookXML);
		display=""+
		"<div class=\"bookinfobox\"><table>"+
			"<tr>"+
				"<td>"+
					"Spectre ID:"+
				"</td>"+
				"<td>"+
					book.spectre_id+
				"</td>"+
			"</tr>";
		if (book.has_id_code)
		{
			display = display + 
			"<tr>"+
				"<td>"+
					"ID Code:"+
				"</td>"+
				"<td>"+
					book.id_code+
				"</td>"+
			"</tr>";
		}
		if (book.has_isbn)
		{
			display = display + 
			"<tr>"+
				"<td>"+
					"ISBN:"+
				"</td>"+
				"<td>"+
					book.isbn+
				"</td>"+
			"</tr>";
		}
		if (book.has_title)
		{
			display = display + 
			"<tr>"+
				"<td>"+
					"Title:"+
				"</td>"+
				"<td>"+
					book.book_title+
				"</td>"+
			"</tr>";
		}
		if (book.has_author)
		{
			display = display + 
			"<tr>"+
				"<td>"+
					"Author:"+
				"</td>"+
				"<td>"+
					book.author+
				"</td>"+
			"</tr>";
		}
		if (book.is_out)
		{
			display = display + 
			"<tr>"+
				"<td>"+
					"Checked Out:"+
				"</td>"+
				"<td>"+
					bookXML.getElementsByTagName("o")[0].getElementsByTagName("date")[0].childNodes[0].nodeValue+
				"</td>"+
			"</tr>";
		}
		display = display+"</table><br />";
		if (book.is_out)
		{
			display = display + "<input type=\"button\" class=\"btn\" name=\"submit\" value=\"Check In\" onclick=\"javascript:displayBook(book.spectre_id,\'userid=\'+userid+\'&checkin=True\');\"/>";
		} else {
			display = display + "<input type=\"button\" class=\"btn\" name=\"submit\" value=\"Check Out\" onclick=\"javascript:displayBook(book.spectre_id,\'userid=\'+userid+\'&checkout=True\');\"/>";
		}
		display = display+"</div>";
		document.getElementById("bookbox").innerHTML=display;
	});
		
}

/**
This is very important. It is the book object. The books are all stored as book objects. It is crafted from some xml, which looks like this:

<b>
	<a>author name</a>
	<s>spectre id</s>
	<c>id code</c>
	<i>isbn</i>
	<t>title</t>
	<o /> - if its out
	(in the more detailed version, the one requested to display book details, you also get:)
	<o>
		<date>date out</o>
		<name>name of user who has it </name>
	</o>
	<history> - there may be multiple of these
		<name>name of a user who once had it </name>
		<dateout>date taken out</dateout>
		<datein>date taken in</datein>
	</history>
</b>

attributes:
spectre_id
has_id_code: boolean
id_code:
has_isbn: boolean
isbn
has_author: boolean
author
has_title: boolean
book_title
is_out: boolean
**/
function Book(xml)
{
	this.spectre_id = xml.getElementsByTagName("s")[0].childNodes[0].nodeValue;
	this.has_id_code = false;
	if (xml.getElementsByTagName("c").length > 0)
	{
		this.has_id_code = true;
	}
	if (this.has_id_code)
	{
		this.id_code = xml.getElementsByTagName("c")[0].childNodes[0].nodeValue;
	} else {
		this.id_code = "";
	}
	this.has_isbn = (xml.getElementsByTagName("i").length > 0);
	if (this.has_isbn)
	{
		this.isbn = xml.getElementsByTagName("i")[0].childNodes[0].nodeValue;
	} else {
		this.isbn = "";
	}
	this.has_author = (xml.getElementsByTagName("a").length > 0);
	if (this.has_author)
	{
		this.author = xml.getElementsByTagName("a")[0].childNodes[0].nodeValue;
	} else {
		this.author = "";
	}
	this.has_title = (xml.getElementsByTagName("t").length > 0);
	if (this.has_title)
	{
		this.book_title = xml.getElementsByTagName("t")[0].childNodes[0].nodeValue;
	} else {
		this.book_title = "";
	}
	this.is_out = (xml.getElementsByTagName("o").length > 0);
}

/**
for comparing strings for sorting purposes. 
**/
function compareStrings(a, b)
{
	var nameA = a.toLowerCase( );
	var nameB = b.toLowerCase( );
	if (nameA < nameB)
	{
		return -1;
	}
	if (nameA > nameB)
	{
		return 1;
	}
	return 0;
}

/**
put this in the array.sort to sort an array of books by spectre_id
**/
function sortBooksBySpectreID(a,b)
{
	return (parseInt(a.spectre_id) - parseInt(b.spectre_id));
}


/**
put this in the array.sort to sort an array of books by id code
**/
function sortBooksByIDCode(a,b)
{
	if (!(a.has_id_code))
	{
		return -1;
	}
	if (!(b.has_id_code))
	{
		return 1;
	}
	return (parseInt(a.id_code) - parseInt(b.id_code));
}


/**
put this in the array.sort to sort an array of books by isbn
**/
function sortBooksByISBN(a,b)
{
	return compareStrings(a.isbn,b.isbn);
}


/**
put this in the array.sort to sort an array of books by author
**/
function sortBooksByAuthor(a,b)
{
	return compareStrings(a.author,b.author);
}

/**
put this in the array.sort to sort an array of books by title
**/
function sortBooksByTitle(a,b)
{
	return compareStrings(a.book_title,b.book_title);
}

/**
put this in the array.sort to sort an array of books by whether they're out
**/
function sortBooksByOut(a,b)
{
	if ((b.is_out) && (!(a.is_out)))
	{
		return -1;
	}
	return 1;
}

/**
put this in the array.sort to sort an array of books by the reverse of whatever sort function you put in it.
**/
function invert(sortFunc)
{
	return (function(a,b)
			{
				return (-(sortFunc(a,b)));
			})
}









/**
returns a string representing all the books stored as a fancy table
**/
function displayBooks(books)
{	
	var answer = "";
	var i = 0;
	var oddRow = 0;
	for(i = 0; i < books.length; i ++)
	{
		answer = answer + ("<tr onclick=\"javascript:displayBook("+books[i].spectre_id+",\'\');\" class=\"");
		if (oddRow == 0)
		{
			answer = answer + ("odd");
		} else {
			answer = answer + ("even");
		}
		answer = answer + ("\">");
		answer = answer + ("<td>");
		answer = answer+(books[i].spectre_id);
		answer = answer + ("</td>");
		answer = answer + ("<td>");
		answer = answer+(books[i].id_code);
		answer = answer + ("</td>");
		answer = answer + ("<td>");
		answer = answer+(books[i].isbn);
		answer = answer + ("</td>");
		answer = answer + ("<td>");
		answer = answer+(books[i].author);
		answer = answer + ("</td>");
		answer = answer + ("<td>");
		answer = answer+(books[i].book_title);
		answer = answer + ("</td>");
		answer = answer + ("<td>");
		if(books[i].is_out > 0)
		{
			answer = answer + ("OUT");
		}
		answer = answer + ("</td></tr>");
		oddRow++;
		if (oddRow == 2)
		{
			oddRow = 0;
		}
	}
	return answer;
}











/**
ajaxRequest

returns the type of request object useful for this browser.
This is likely to be ActiveXObject['Microsoft.XMLHTTP'] in old IE, or XMLHTTPRequest otherwise.
Thanks http://www.javascriptkit.com/jsref/ajax.shtml!
**/
function ajaxRequest()
{
	var activexmodes=["Msxml2.XMLHTTP", "Microsoft.XMLHTTP"] //activeX versions to check for in IE
	if (window.ActiveXObject) //Test for support for ActiveXObject in IE first (as XMLHttpRequest in IE7 is broken)
	{ 
		for (var i=0; i<activexmodes.length; i++)
		{
			try
			{
				return new ActiveXObject(activexmodes[i])
			}
			catch(e)
			{
				//suppress error
			}
		}
	}
	else if (window.XMLHttpRequest) // if Mozilla, Safari etc
	{
		return new XMLHttpRequest()
	}
	else
	{
		return false
	}
}






/**
loadXML

This function is for retrieving javascript xml objects from the server. 
It can work syncronously or asyncronously, and send GET, POST, or no parameters. 

url - the url you want to get your xml from

parameters - the parameter string (make sure to sanatize it! encodeURIComponent() may be useful for that!)

processor - if you want to be asyncronous, put in a function here that will take an xml object as input.
This will be called when the server responds. processor = null by default.

post - True if you want to send parameters by POST, false for GET. true by default.

return - this will return the xml object if processor is not set or is null, and will otherwise return null. 
If it returns null, this is because it is asyncronous, and processor(xml) will be called on server response.
**/
function loadXML(url,parameters,processor,post)
{
	return loadXMLorText(true,url,parameters,processor,post)
}






/**
loadText

This function is for retrieving text from the server. 
It can work syncronously or asyncronously, and send GET, POST, or no parameters. 

url - the url you want to get your text from

parameters - the parameter string (make sure to sanatize it! encodeURIComponent() may be useful for that!)

processor - if you want to be asyncronous, put in a function here that will take text as input.
This will be called when the server responds. processor = null by default.

post - True if you want to send parameters by POST, false for GET. true by default.

return - this will return the xml object if processor is not set or is null, and will otherwise return null. 
If it returns null, this is because it is asyncronous, and processor(text) will be called on server response.
**/
function loadText(url,parameters,processor,post)
{
	return loadXMLorText(false,url,parameters,processor,post)
}







/**
loadText

This function is for retrieving javascript xml objects or text from the server. 
It can work syncronously or asyncronously, and send GET, POST, or no parameters. 

xmlortext - true for xml, false for text

url - the url you want to get your xml or text from

parameters - the parameter string (make sure to sanatize it! encodeURIComponent() may be useful for that!)

processor - if you want to be asyncronous, put in a function here that will take an xml object or text as input.
This will be called when the server responds. processor = null by default.

post - True if you want to send parameters by POST, false for GET. true by default.

return - this will return the xml object or text if processor is not set or is null, and will otherwise return null. 
If it returns null, this is because it is asyncronous, and processor(xml or text) will be called on server response.
**/
function loadXMLorText(xmlortext,url,parameters,processor,post)
{
	
	
	
	//First, establish default inputs:
	//set default url to this page itself (this isn't likely valid xml, but why not?)
	if(url === undefined)
	{
		url = location.href
	}
	
	//set default parameters to ''
	if( parameters === undefined)
	{
		parameters = '';
	}
	
	//decide whether this is async, and set the processor function (default is null)
	var async;
	if(processor === undefined || processor == null)
	{
		processor = null;
		async = false;
	} else {
		async = true;
	}
	
	//set default post to true
	if(post === undefined)
	{
		post = true
	}
	
	
	//Second, establish useful function variables:
	//establish the type of request
	var requestType;
	if(post)
	{
		requestType = "POST";
	} else {
		requestType = "GET";
		url = url+"?"+parameters //if it is get, you need to put the parameters in the url.
	}
	
	//create xmlDoc, which will be our request object
	var xmlDoc;
	
	//this is to be the processor function that will actually be called on state change
	var stateChangeProcessor
	
	//create the function that will be called when the server responds
	function state_Change()
	{
	if (xmlDoc.readyState==4)
	  {// 4 = "loaded"
	  if (xmlDoc.status==200)
	    {// 200 = OK
			var xml=getXMLFromRequest(xmlDoc); //get the xml object
	    	stateChangeProcessor(xml); //send the sml object to the processor function
	    }
	  else //there was a problem with the xml data
	    {
	    	/**
	    	
	    	----------   NOTE TO DEVELOPERS   --------
	    	IT IS TREMENDOUSLY USEFUL TO UNCOMMENT 
	    	THE LINE BELOW, AS IT ALLOWS YOU TO SEE
	    	WHEN YOUR AJAX HAS FAILED, BUT NO FINAL
	    	USER WANT TO GET THESE, EVEN IF IT HAS
	    	FAILED, SO I HAVE COMMENTED IT OUT.
	    	
	    	**/
	    	//alert("Problem retrieving XML data");
	    }
	  }
	}
	
	//you have to be able to get an xml object out of your request, which is hard in IE.
	//this will get the text instead of the xml if xmlortext is false
	function getXMLFromRequest(oRequest)
	{
		if(xmlortext)
		{
			if (isIE && oRequest.responseText != null) 
			{
				//in IE, you need to get the text from the response, and feed it to an xml object.
				xmlText = oRequest.responseText;
				xml = new ActiveXObject('Microsoft.XMLDOM');
				xml.loadXML(xmlText);
				return xml;
			} else {
				//otherwise, it's really simple.
				return oRequest.responseXML;
			}
		} else {
			return oRequest.responseText;
		}
	}
	
	//Third, perform the request
	//create the request object of the appropriate type using ajaxRequest()
	xmlDoc = new ajaxRequest();
	
	
	//Ensure that the servers response is interpreted as xml (if possible)
	//Unless this function works, you must be in IE (or something else ugly) responseXML doesn't work right.
	var isIE = true; 
	if (xmlDoc.overrideMimeType)
	{
		xmlDoc.overrideMimeType('text/xml');
		isIE = false;
	}
	
	
	
	//set the processor to be called on state change to the processor input
	stateChangeProcessor = processor;
	
	
	
	//set the state change function to be called by xmlDoc when the server responds
	xmlDoc.onreadystatechange=state_Change;
	
	//open the request with type, url, and whether or not it's async. 
	xmlDoc.open(requestType,url,async);
	
	//before sending, you need to setRequestHeader if it's POST, and only post sends the parameters seperately.
	if(post)
	{
		xmlDoc.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlDoc.send(parameters); //send POST request
	} else {
		xmlDoc.send(null);
	}
	
	//Fourth, if it's async, you just return null, otherwise, the code will be stalled until server response, and you return with the xml object.
	if(async)
	{
		return null;
	} else {
		return getXMLFromRequest(xmlDoc);
	}
}
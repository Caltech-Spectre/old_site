#imports
from spectreDatabase.models import Book, User, Loan, History
from django.http import HttpResponse
from xml.sax.saxutils import escape
from xml.dom.minidom import Document
from django.shortcuts import render_to_response, get_object_or_404
from django.db.models import Q
from urllib2 import urlopen
import unicodedata
import datetime
import xml.dom.minidom
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt, csrf_protect





#returns a list of books which contain each of the words (substrings separated by spaces) in filterText in either their spectre_id, idcode, isbn, author, or title
def filterBooks(filterText):
	filterList = filterText.split(" ")
	filteredList = Book.objects.all()
	for f in filterList:
		if f != None and f != "":
			filteredList = filteredList.filter(Q(id__icontains=f) | Q(idcode__icontains=f) | Q(isbn__icontains=f) | Q(author__icontains=f) | Q(title__icontains=f))
	return filteredList



#returns a list of users which contain each of the words (substrings separated by spaces) in filterText in either their name or email or cardnum
def filterUsers(filterText):
	filterList = filterText.split(" ")
	filteredList = User.objects.all()
	for f in filterList:
		if f != None and f != "":
			if f.isdigit():
				f = int(f)
			filteredList = filteredList.filter(Q(name__icontains=str(f)) | Q(email__icontains=str(f)) | Q(cardnum__icontains=f))
	return filteredList



#returns a list of users which contain each of the words (substrings separated by spaces) in filterText in either their name or email
def filterUsersWithoutCardnum(filterText):
	filterList = filterText.split(" ")
	filteredList = User.objects.all()
	for f in filterList:
		if f != None and f != "":
			filteredList = filteredList.filter(Q(name__icontains=f) | Q(email__icontains=f))
	return filteredList







#the actual views are below:

#The main page of Spectre
@csrf_exempt
def mainPage(request):
	return render_to_response('spectreDatabase/mainPageTemplate.html', {})




#loginPage is the main database page and the page you have to log in to to reach it.
@csrf_exempt
def loginPage(request):
	#first, if someone has sent in a spectreUserId, then you need to be sent the database browsing page, or userPage
	try:
		spectreUserId = request.REQUEST['spectreUserId']
		return userPage(request, int(spectreUserId))
	except KeyError:
		#next, if someone has sent a filter, and it narrows the possible users down to one, sent it userPage with that user
		try:
			filterText = request.REQUEST['filter']
			filteredUsers = filterUsers(filterText)
			if (len(filteredUsers) == 1):
				return userPage(request, filteredUsers[0].id)
			else:
				#if it doesn't narrow it down to one user, it sends you a version of the login page with a list of possible, clickable identities. These are sent as comma sepereated lists, because javascript handles the formatting
				filteredUsers = filterUsersWithoutCardnum(filterText)
				if (len(filteredUsers) > 0):
					usernames = ""
					userids = ""
					firstEntry = True
					for user in filteredUsers:
						if firstEntry:
							usernames = usernames+"\""+user.name+"\""
							userids = userids+str(user.id)
							firstEntry = False
						else:
							usernames = usernames+","+"\""+user.name+"\""
							userids = userids + ","+str(user.id)
					return render_to_response('spectreDatabase/loginTemplate.html', {'usernames':usernames, 'userids':userids})
		except KeyError:
			pass
		#when nothing has been sent up, just send down the userpage with nothing special
		return render_to_response('spectreDatabase/loginTemplate.html', {'usernames':"", 'userids':""})



#userpage is just a matter of sending the template with the right things in it.
@csrf_exempt
def userPage(request, spectreUserId):
	user = User.objects.get(id=int(spectreUserId))
	user.lastactive=datetime.date.today()
	user.save()
	return render_to_response('spectreDatabase/userPageTemplate.html', {'userid':spectreUserId, 'username':User.objects.get(id=spectreUserId).name, 'books':len(Book.objects.all())})



#just sends back the number of books a search would return, accepts same stuff as a search
@csrf_exempt
def bookPageSearchCount(request):
	filterText = ""
	try:
		userid = request.REQUEST['userid']
		book_list = []
		for loan in Loan.objects.filter(luser__id=int(userid)):
			book_list.append(loan.lbook)
	except KeyError:
		try:
			filterText = request.REQUEST['filter']
		except KeyError:
			pass
		book_list = filterBooks(filterText)
	return HttpResponse(str(len(book_list)))

"""
takes a min_num, a max_num, a userid, a filter, and an echo, 
Returns an xml list of books that match the filter from the min_num to the max_num (so if 3000 books match the filter, you can get the middle 1000 by setting min_num to 1000 and max_num to 1999).
"""
@csrf_exempt
def bookXMLSearch(request):
	min_num = 0
	max_num = len(Book.objects.all())
	try:
		min_num = request.REQUEST['min_num']
	except KeyError:
		pass
	max_num = len(Book.objects.all())
	try:
		max_num = request.REQUEST['max_num']
	except KeyError:
		pass
	filterText = ""
	try:
		userid = request.REQUEST['userid']
		book_list = []
		for loan in Loan.objects.filter(luser__id=int(userid)):
			book_list.append(loan.lbook)
	except KeyError:
		try:
			filterText = request.REQUEST['filter']
		except KeyError:
			pass
		book_list = filterBooks(filterText)[ min_num:max_num ]
	doc=Document();
	library = doc.createElement("library")
	doc.appendChild(library)
	for book in book_list:
		library.appendChild(book.xml())
	try:
		echoText = request.REQUEST['echo']
		echo = doc.createElement("echo");
		echo.appendChild(doc.createTextNode(escape(echoText)))
		library.appendChild(echo)
	except KeyError:
		pass
	return HttpResponse(doc.toxml(),  mimetype="text/xml")






"""
returns the detailed xml version of a book, provided with a book_id
if given a userid, it will also accept any input value for checkout to check out a book and any for checkin to check in a book.
"""
@csrf_exempt
def bookXML(request, book_id):
	book = get_object_or_404(Book, id=book_id)
	try:
		userid = request.REQUEST['userid']
		try:
			check = request.REQUEST['checkout']
			loan = Loan(lbook=book, luser=User.objects.get(id=userid), date = datetime.date.today())
			loan.save()
			book.last=datetime.date.today()
			if book.checkouts==None:
				book.checkouts=0
			book.checkouts = book.checkouts+1
			book.bloan=loan
			book.save()
		except KeyError:
			pass
		try:
			check = request.REQUEST['checkin']
			loan = Loan.objects.get(lbook__id = book_id)
			history = History(luser=User.objects.get(id=userid), lbook=Book.objects.get(id=book_id), dateout=loan.date, datein=datetime.date.today())
			history.save()
			loan.delete()
			book.last=None
			book.bloan=None
			book.save()
		except KeyError:
			pass
	except KeyError:
		pass
	doc=Document();
	doc.appendChild(book.xml(True))
	return HttpResponse(doc.toxml(),  mimetype="text/xml")




"""
an addUser request, which will accept a name, email, and cardnum input and add that user to the database, and return the login page, or if those inputs fail, send you the add user page with whatever was input in the input boxes, and a big fat error message to tell you what you did wrong.
"""
@csrf_exempt
def addUser(request):
	this_name = ""
	this_email = ""
	this_cardnum = ""
	try:
		this_name = request.REQUEST['name']
		this_email = request.REQUEST['email']
		this_cardnum = request.REQUEST['cardnum']
		if (this_cardnum == ""):
			this_cardnum = None
		if (this_name == ""):
			return render_to_response('spectreDatabase/addUserTemplate.html', {'error':'FILL IN YOUR NAME', 'name':this_name, 'email':this_email, 'cardnum':this_cardnum})
		if this_cardnum != None:
			try:
				this_cardnum = int(this_cardnum)
			except ValueError:
				return render_to_response('spectreDatabase/addUserTemplate.html', {'error':'DESIGNATION MUST BE A NUMBER', 'name':this_name, 'email':this_email, 'cardnum':this_cardnum})
		user = User(name=this_name, email=this_email, cardnum=this_cardnum, created = datetime.date.today(), lastactive = datetime.date.today())
		user.save()
		return loginPage(request)
	except KeyError:
		return render_to_response('spectreDatabase/addUserTemplate.html', {'error':'', 'name':this_name, 'email':this_email, 'cardnum':this_cardnum})





"""
adding a Book
"""
@csrf_protect
def addBook(request):
	search_barcode = ""
	search_isbn = ""
	have_this_book = "false"
	this_title = ""
	this_author = ""
	focus="barcode"
	
	try:
		search_barcode = request.REQUEST['barcode']
		filteredList = Book.objects.filter(idcode__icontains=(search_barcode))
		focus = "isbn"
		if len(filteredList) > 0:
			have_this_book = "true"
			focus = "next"
	except KeyError:
		pass
	
	
	
	
	try:
		search_isbn = request.REQUEST['isbn']
		if search_isbn != "":
			doc = xml.dom.minidom.parse(urlopen("http://isbndb.com/api/books.xml?access_key=SFGREDG2&index1=isbn&value1="+search_isbn))
			
			if len(doc.getElementsByTagName("TitleLong")[0].childNodes) > 0:
				this_title = doc.getElementsByTagName("TitleLong")[0].childNodes[0].nodeValue.title()
				
			else:
				if len(doc.getElementsByTagName("Title")[0].childNodes) > 0:
					this_title = doc.getElementsByTagName("Title")[0].childNodes[0].nodeValue.title()
			
			if len(doc.getElementsByTagName("AuthorsText")[0].childNodes) > 0:
				this_author = doc.getElementsByTagName("AuthorsText")[0].childNodes[0].nodeValue
			
			focus = "title"
		
	except KeyError:
		pass
	except IndexError:
		focus = "title"
	c = {'barcode':search_barcode, 'isbn':search_isbn, 'have_this_book':have_this_book, 'title':this_title, 'author':this_author, 'focus':focus}
	c.update(csrf(request))
	
	return render_to_response('spectreDatabase/addBookTemplate.html', c)
	

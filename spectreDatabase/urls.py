from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
	
	#The main page also appears at /spectre/
	(r'^$', 'spectreDatabase.views.mainPage'),
	
	#loginPage, where you actually log in and browse and use the database, is at /spectre/login/
	(r'^login/$', 'spectreDatabase.views.loginPage'),
	
	#/spectre/book/search/count/, where the javascript in the database checks to see how many books will result from a search, so it can make the appropriate number of requests
	(r'^book/search/count/$', 'spectreDatabase.views.bookPageSearchCount'),
	
	#/spectre/book/search/xml/, where the javascript sends search queries and gets answers in xml
	(r'^book/search/xml/$', 'spectreDatabase.views.bookXMLSearch'),
	
	#/spectre/book/NUMBERHERE/xml/, where the javascript gets details on a book given its number
	(r'^book/(?P<book_id>\d+)/xml/$', 'spectreDatabase.views.bookXML'),
	
	#/spectre/user/add/, the page where you can join spectre, and add a user
	(r'^user/add/$', 'spectreDatabase.views.addUser'),
	
	#/spectre/book/add/, the page where you can add a book, if you're logged in to the admin page
	(r'^book/add/$', 'spectreDatabase.views.addBook'),
	
	#/spectre/media/, the static media folder, the contents of which django does not process.
	(r'^media/(?P<path>.*)$', 'django.views.static.serve',
		{'document_root': 'spectreDatabase/media/'}),
)

from django.db import models
import unicodedata
from xml.sax.saxutils import escape
from xml.dom.minidom import Document
import datetime



"""
A User, as in one who can log into the spectre database
users have a name, an email, a cardnum (UID), a created date, and a lastactive date.
only name and email are required.
It's pretty self-explanatory
"""
class User(models.Model):
  class Admin:
    list_display = ("name", "email", "cardnum", "created", "lastactive")
    list_filter = ("created", "lastactive")
    search_fields = ("name",)
  def __str__(s):
    return s.name
  name = models.CharField("Name", max_length = 500)
  email = models.CharField("Email", max_length = 500)
  cardnum = models.IntegerField(null = True, blank = True)
  created = models.DateField("Created", null = True, blank = True)
  lastactive = models.DateField("Last Active", null = True, blank = True)
  class Meta:
    db_table = "Users"

"""
Loans have a book, a user, and a date (no, I don't know why it's lbook and luser, but that's what the old database had).
When you checka book out, a loan is created with your user, that book, and the date at the time. When you check it back in, that loan is deleted.
"""
class Loan(models.Model):
  class Admin:
    pass
  def __str__(s):
    return (unicodedata.normalize('NFKD', unicode("%s loaned to %s on %s" % (str(s.lbook), str(s.luser), str(s.date)))).encode('ascii','ignore'))
  lbook = models.ForeignKey("Book", verbose_name = "Book", null = True, blank = True)
  luser = models.ForeignKey(User, verbose_name = "User", null = True, blank = True)
  date = models.DateField("Date", null = True, blank = True)
  class Meta:
    db_table = "Loans"

"""
Books have a title, an author, an isbn number, an id_code, a bought date, a last date, checkouts (a number) and bloan. These seem pretty self-explanatory (since I'm guessing based on the names in the old database)
I added an isOut method. obvious
I added an xml method, which returns a minidom object of this book, and if you put in extended=True, you can get extra information, like its history, and when it was checked out.
"""
class Book(models.Model):
	def __str__(s):
		return (unicodedata.normalize('NFKD', unicode("%s - %s (%s): %s" % (str(s.id), s.title, s.author, s.isbn))).encode('ascii','ignore'))
	def page(s):
		return escape("%s (%s): %s" % (s.title, s.author, s.isbn))
	def row(s):
		# s, c, i, a, t, o
		return ("<td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td>" % (str(s.id), str(s.idcode), escape(s.isbn), escape(s.author), escape(s.title), str(s.isOut())))
	def isOut(this):
		try :
			loan = Loan.objects.get(lbook=this)
			return True
		except Loan.DoesNotExist :
			return False
	def xml(this, extended= False ):
		doc = Document()
		b = doc.createElement("b")
		doc.appendChild(b)
		s = doc.createElement("s")
		s.appendChild(doc.createTextNode(str(this.id)))
		b.appendChild(s)
		if ((this.title != None) and (this.title != "")):
			t = doc.createElement("t")
			t.appendChild(doc.createTextNode(escape(this.title)))
			b.appendChild(t)
		if ((this.author != None) and (this.author != "")):
			a = doc.createElement("a")
			a.appendChild(doc.createTextNode(escape(this.author)))
			b.appendChild(a)
		if ((this.isbn != None) and (this.isbn != "") and (this.isbn != "0")):
			i = doc.createElement("i")
			i.appendChild(doc.createTextNode(escape(this.isbn)))
			b.appendChild(i)
		if ((this.idcode != None) and (this.idcode != "")):
			c = doc.createElement("c")
			c.appendChild(doc.createTextNode(str(this.idcode)))
			b.appendChild(c)
		if this.isOut() :
			loan = Loan.objects.get(lbook=this)
			o = doc.createElement("o")
			b.appendChild(o)
			if extended:
				name = doc.createElement("name")
				name.appendChild(doc.createTextNode(escape(loan.luser.name)))
				o.appendChild(name)
				
				date = doc.createElement("date")
				date.appendChild(doc.createTextNode(escape(str(loan.date))))
				o.appendChild(date)
		if extended:
			for hist in History.objects.filter(lbook=this).order_by("-dateout"):
				history = doc.createElement("history")
				b.appendChild(history)
				histUser = doc.createElement("name")
				histUser.appendChild(doc.createTextNode(escape(hist.luser.name)))
				history.appendChild(histUser)
				dateout = doc.createElement("dateout")
				dateout.appendChild(doc.createTextNode(escape(str(hist.dateout))))
				history.appendChild(dateout)
				datein = doc.createElement("datein")
				datein.appendChild(doc.createTextNode(escape(str(hist.datein))))
				history.appendChild(datein)
		return b
	class Admin:
		list_display = ("title", "author", "isbn", "last", "checkouts")
		list_filter = ("bought", "last", "checkouts")
		search_fields = ("title", "author")
	title = models.CharField("Title", max_length = 500)
	author = models.CharField("Author", max_length = 500)
	isbn = models.CharField("ISBN", max_length = 15, blank = True)
	bought = models.DateField("Date Entered", null = True, blank = True)
	last = models.DateField("Last Checkout", null = True, blank = True)
	checkouts = models.IntegerField("Checkouts", null = True, blank = True)
	idcode = models.IntegerField("Barcode", null = True, blank = True)
	bloan = models.ForeignKey(Loan, verbose_name = "Loan", null = True, blank = True)
	class Meta:
		db_table = "Books"

"""
History, when which book was checked out to who and when it came back. simple.
"""
class History(models.Model):
  class Admin:
    pass
  def __str__(s):
    return (unicodedata.normalize('NFKD', unicode("%s loaned to %s on %s, and returned on %s" % (str(s.lbook), str(s.luser), str(s.dateout), str(s.datein)))).encode('ascii','ignore'))
  luser = models.ForeignKey(User, blank=True, null=True, related_name="user")
  lbook = models.ForeignKey(Book, blank=True, null=True, related_name="book")
  dateout = models.DateField(null=True, blank=True)
  datein = models.DateField(null=True, blank=True)
  class Meta:
    db_table = 'Histories'

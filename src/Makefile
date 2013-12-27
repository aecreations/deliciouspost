# Makefile for the Delicious Post extension

EXT_VER=`./getver.pl`
DIST_FILE=aedeliciouspost-$(EXT_VER).xpi
EXCLUDE=\*.html \*.pl \*~ Makefile


$(DIST_FILE): install.rdf
	zip -r $(DIST_FILE) * -x $(EXCLUDE)

clean:
	rm $(DIST_FILE)

# END Makefile

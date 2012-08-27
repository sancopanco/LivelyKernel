module('lively.morphic.StyleSheetsHTML').requires('lively.morphic.HTML').toRun(function() {

    Object.extend(lively.morphic.Morph.prototype.htmlDispatchTable, {
        setStyleSheetRules: 'setStyleSheetRulesHTML'
    });
    
    lively.morphic.Morph.addMethods(
    'stylesheets', {

        compileStyleSheet: function(rules) {
            // Takes a list of CSS rules and assembles a style
            // sheet which can be injected into the DOM.
            // If this morph is not the world, the selectors
            // are extended so the rules may not be applied
            // to morphs outside the addressed hierarchy.
            // Helper function for setStyleSheetHTML.

            var output = '';

            rules.each(function(rule) {
                    var selectors = this.splitGroupedSelector(rule.selectorText()),
                        newSelector = '';
                    for (var i = 0; i < selectors.length; i++) {
                        newSelector += this.addSelectorPrefixes(selectors[i]);
                        if (i < selectors.length - 1) {
                            newSelector += ', ';
                        }
                    }
                    output += newSelector + ' {';
                    output += '\n';
                    rule.declarations.each(function(d) {
                            output += '\t'+d.parsedCssText;
                            output += '\n';
                        });
                    output += '}\n';
                }, this);

            return output;
        },
        addSelectorPrefixes: function(selector, morphPrefix) {
            // Doubles a selector to include its child and
            // itself and adds an attribute selector prefix.
            // Helper function for compileStyleSheet.

            var extendedSelector = '',
                morphPrefix = '*[morphid="'+this.id+'"]';

            // Include the childs of the morph ...
            extendedSelector += morphPrefix;
            extendedSelector += ' ';
            extendedSelector += selector;

            // Include the morph itself ...
            extendedSelector += ', ';
            extendedSelector += morphPrefix;
            extendedSelector += selector;

            return extendedSelector;
        },

        splitGroupedSelector: function(selector) {
            // Splits a grouped selector and returns
            // its single selectors as an array.
            // Helper function for compileStyleSheet.

            var selectorList = selector.
                    split(/[\x20\t\r\n\f]*,[\x20\t\r\n\f]*/);
            return selectorList.collect(function(s) {
                    return s.trim();
                });
        },

        setStyleSheetRulesHTML: function(ctx,rules) {
            // Compiles the input style rules to an 
            // HTML specific style sheet and adds this
            // to the DOM.
            // Called when a new style sheet was applied to
            // the morph (i.e. through setStyleSheet) and
            // in the initHTML method of the morph.

            var styleTagId = "style-for-"+this.id,
            compiledCss = this.compileStyleSheet(rules);

    	    if (ctx.styleNode) {
        	   $(ctx.styleNode).remove();
                }
                if (rules.length && rules.length > 0 &&
                    compiledCss && compiledCss.length &&
                    compiledCss.length > 0) {
    	           ctx.styleNode = $('<style type="text/css" id="' +
    	               styleTagId + '"></style>');
    	           ctx.styleNode.text(compiledCss);
    	           ctx.styleNode.appendTo(document.head);
    	        }
            }
    }
    )
) // end of module()
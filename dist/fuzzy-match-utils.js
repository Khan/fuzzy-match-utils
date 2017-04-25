'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.filterOptions = filterOptions;
exports.typeaheadSimilarity = typeaheadSimilarity;
exports.fullStringDistance = fullStringDistance;
exports.cleanUpText = cleanUpText;


/**
 * Filters React Select options and sorts by similarity to a search filter.
 * Handles partial matches, eg. searching for "Waberg High" will find "Raoul
 * Wallenberg Traditional High School". Case insensitive. Ignores
 * non-alphanumeric characters.
 *
 * @param  options  An unfiltered list of Options.
 * @param? filter  A string to compare against Option labels.
 * @param? substitutions  Strings with multiple spellings or variations that we
 *           expect to match, eg. accented characters or abbreviated words.
 *
 * @return A filtered and sorted array of Options.
 */

/**
 * A collection of string matching algorithms built with React Select in mind.
 */

// Option type from React Select and similar libraries.
function filterOptions(options, filter, substitutions) {
    // If the filter is blank, return the full list of Options.
    if (!filter) {
        return options;
    }

    var cleanFilter = cleanUpText(filter, substitutions);
    return options
    // Filter out undefined or null Options.
    .filter(function (_ref) {
        var label = _ref.label,
            value = _ref.value;
        return label != null && value != null;
    })
    // Create a {score, Option} pair for each Option based on its label's
    // similarity to the filter text.
    .map(function (option) {
        return {
            option: option,
            score: typeaheadSimilarity(cleanUpText(option.label, substitutions), cleanFilter)
        };
    })
    // Only include matches of the entire substring, with a slight
    // affordance for transposition or extra characters.
    .filter(function (pair) {
        return pair.score >= cleanFilter.length - 2;
    })
    // Sort 'em by order of their score.
    .sort(function (a, b) {
        return b.score - a.score;
    })
    // …and grab the original Options back from their pairs.
    .map(function (pair) {
        return pair.option;
    });
}

/**
 * Scores the similarity between two strings by returning the length of the
 * longest common subsequence. Intended for comparing strings of different
 * lengths; eg. when matching a typeahead search input with a school name.

 * Meant for use in an instant search box where results are being fetched
 * as a user is typing.
 *
 * @param  a  The longer string (though, we flip them if it's shorter).
 * @param  b  The shorter string, eg. a typeahead search input.
 *
 * @return The length of the longest common subsequence. Higher scores indicate
 *           closer matches.
 */
function typeaheadSimilarity(a, b) {
    var aLength = a.length;
    var bLength = b.length;
    var table = [];

    if (!aLength || !bLength) {
        return 0;
    }

    // Ensure `a` isn't shorter than `b`.
    if (aLength < bLength) {
        var _ref2 = [b, a];
        a = _ref2[0];
        b = _ref2[1];
    }

    // Early exit if `a` includes `b`; these will be scored higher than any
    // other options with the same `b` (filter string), with a preference for
    // shorter `a` strings (option labels).
    if (a.indexOf(b) !== -1) {
        return bLength + 1 / aLength;
    }

    // Initialize the table axes:
    //
    //    0 0 0 0 ... bLength
    //    0
    //    0
    //
    //   ...
    //
    // aLength
    //
    for (var x = 0; x <= aLength; ++x) {
        table[x] = [0];
    }
    for (var y = 0; y <= bLength; ++y) {
        table[0][y] = 0;
    }

    // Populate the rest of the table with a dynamic programming algorithm.
    for (var _x = 1; _x <= aLength; ++_x) {
        for (var _y = 1; _y <= bLength; ++_y) {
            table[_x][_y] = a[_x - 1] === b[_y - 1] ? 1 + table[_x - 1][_y - 1] : Math.max(table[_x][_y - 1], table[_x - 1][_y]);
        }
    }

    return table[aLength][bLength];
}

/**
 * Returns the Levenshtein distance between two strings.
 *
 * NOTE: The Jaro-Winkler distance also worked well and is slightly more
 * performant. Levenshtein seems to match more reliably, which is more
 * important here.
 *
 * @param  a  The first string for comparison.
 * @param  b  The second string for comparison.
 *
 * @return The Levenshtein distance, where lower distance indicates higher
 *           similarity.
 */
function fullStringDistance(a, b) {
    var aLength = a.length;
    var bLength = b.length;
    var table = [];

    if (!aLength) {
        return bLength;
    }
    if (!bLength) {
        return aLength;
    }

    // Initialize the table axes:
    //
    //    0 1 2 3 4 ... bLength
    //    1
    //    2
    //
    //   ...
    //
    // aLength
    //
    for (var x = 0; x <= aLength; ++x) {
        table[x] = [x];
    }
    for (var y = 0; y <= bLength; ++y) {
        table[0][y] = y;
    }

    // Populate the rest of the table with a dynamic programming algorithm.
    for (var _x2 = 1; _x2 <= aLength; ++_x2) {
        for (var _y2 = 1; _y2 <= bLength; ++_y2) {
            table[_x2][_y2] = a[_x2 - 1] === b[_y2 - 1] ? table[_x2 - 1][_y2 - 1] : 1 + Math.min(table[_x2 - 1][_y2], // Substitution,
            table[_x2][_y2 - 1], // insertion,
            table[_x2 - 1][_y2 - 1]); // and deletion.
        }
    }

    return table[aLength][bLength];
}

/**
 * Apply string substitutions, remove non-alphanumeric characters, and convert
 * all letters to uppercase.
 *
 * eg. 'Scoil Bhríde Primary School' may become 'SCOILBHRIDEPRIMARYSCHOOL'.
 *
 * @param  input  An unsanitized input string.
 * @param  substitutions  Strings with multiple spellings or variations that we
 *          expect to match, for example accented characters or abbreviated
 *          words.
 *
 * @return The sanitized text.
 */
function cleanUpText(input, substitutions) {
    if (!input) {
        return '';
    }

    // Uppercase and remove all non-alphanumeric, non-accented characters.
    // Also remove underscores.
    input = input.toUpperCase().replace(/((?=[^\u00E0-\u00FC])\W)|_/g, '');

    if (!substitutions) {
        return input;
    }
    var safeSubstitutions = substitutions; // For Flow.

    // Replace all strings in `safeSubstitutions` with their standardized
    // counterparts.
    return Object.keys(safeSubstitutions).reduce(function (output, substitution) {
        var unsubbed = new RegExp(substitution, 'g');
        return output.replace(unsubbed, safeSubstitutions[substitution]);
    }, input);
}

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,setImmediate){(function (){
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.async = {})));
}(this, (function (exports) { 'use strict';

    /**
     * Creates a continuation function with some arguments already applied.
     *
     * Useful as a shorthand when combined with other control flow functions. Any
     * arguments passed to the returned function are added to the arguments
     * originally passed to apply.
     *
     * @name apply
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {Function} fn - The function you want to eventually apply all
     * arguments to. Invokes with (arguments...).
     * @param {...*} arguments... - Any number of arguments to automatically apply
     * when the continuation is called.
     * @returns {Function} the partially-applied function
     * @example
     *
     * // using apply
     * async.parallel([
     *     async.apply(fs.writeFile, 'testfile1', 'test1'),
     *     async.apply(fs.writeFile, 'testfile2', 'test2')
     * ]);
     *
     *
     * // the same process without using apply
     * async.parallel([
     *     function(callback) {
     *         fs.writeFile('testfile1', 'test1', callback);
     *     },
     *     function(callback) {
     *         fs.writeFile('testfile2', 'test2', callback);
     *     }
     * ]);
     *
     * // It's possible to pass any number of additional arguments when calling the
     * // continuation:
     *
     * node> var fn = async.apply(sys.puts, 'one');
     * node> fn('two', 'three');
     * one
     * two
     * three
     */
    function apply(fn, ...args) {
        return (...callArgs) => fn(...args,...callArgs);
    }

    function initialParams (fn) {
        return function (...args/*, callback*/) {
            var callback = args.pop();
            return fn.call(this, args, callback);
        };
    }

    /* istanbul ignore file */

    var hasQueueMicrotask = typeof queueMicrotask === 'function' && queueMicrotask;
    var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
    var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

    function fallback(fn) {
        setTimeout(fn, 0);
    }

    function wrap(defer) {
        return (fn, ...args) => defer(() => fn(...args));
    }

    var _defer;

    if (hasQueueMicrotask) {
        _defer = queueMicrotask;
    } else if (hasSetImmediate) {
        _defer = setImmediate;
    } else if (hasNextTick) {
        _defer = process.nextTick;
    } else {
        _defer = fallback;
    }

    var setImmediate$1 = wrap(_defer);

    /**
     * Take a sync function and make it async, passing its return value to a
     * callback. This is useful for plugging sync functions into a waterfall,
     * series, or other async functions. Any arguments passed to the generated
     * function will be passed to the wrapped function (except for the final
     * callback argument). Errors thrown will be passed to the callback.
     *
     * If the function passed to `asyncify` returns a Promise, that promises's
     * resolved/rejected state will be used to call the callback, rather than simply
     * the synchronous return value.
     *
     * This also means you can asyncify ES2017 `async` functions.
     *
     * @name asyncify
     * @static
     * @memberOf module:Utils
     * @method
     * @alias wrapSync
     * @category Util
     * @param {Function} func - The synchronous function, or Promise-returning
     * function to convert to an {@link AsyncFunction}.
     * @returns {AsyncFunction} An asynchronous wrapper of the `func`. To be
     * invoked with `(args..., callback)`.
     * @example
     *
     * // passing a regular synchronous function
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(JSON.parse),
     *     function (data, next) {
     *         // data is the result of parsing the text.
     *         // If there was a parsing error, it would have been caught.
     *     }
     * ], callback);
     *
     * // passing a function returning a promise
     * async.waterfall([
     *     async.apply(fs.readFile, filename, "utf8"),
     *     async.asyncify(function (contents) {
     *         return db.model.create(contents);
     *     }),
     *     function (model, next) {
     *         // `model` is the instantiated model object.
     *         // If there was an error, this function would be skipped.
     *     }
     * ], callback);
     *
     * // es2017 example, though `asyncify` is not needed if your JS environment
     * // supports async functions out of the box
     * var q = async.queue(async.asyncify(async function(file) {
     *     var intermediateStep = await processFile(file);
     *     return await somePromise(intermediateStep)
     * }));
     *
     * q.push(files);
     */
    function asyncify(func) {
        if (isAsync(func)) {
            return function (...args/*, callback*/) {
                const callback = args.pop();
                const promise = func.apply(this, args);
                return handlePromise(promise, callback)
            }
        }

        return initialParams(function (args, callback) {
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (result && typeof result.then === 'function') {
                return handlePromise(result, callback)
            } else {
                callback(null, result);
            }
        });
    }

    function handlePromise(promise, callback) {
        return promise.then(value => {
            invokeCallback(callback, null, value);
        }, err => {
            invokeCallback(callback, err && err.message ? err : new Error(err));
        });
    }

    function invokeCallback(callback, error, value) {
        try {
            callback(error, value);
        } catch (err) {
            setImmediate$1(e => { throw e }, err);
        }
    }

    function isAsync(fn) {
        return fn[Symbol.toStringTag] === 'AsyncFunction';
    }

    function isAsyncGenerator(fn) {
        return fn[Symbol.toStringTag] === 'AsyncGenerator';
    }

    function isAsyncIterable(obj) {
        return typeof obj[Symbol.asyncIterator] === 'function';
    }

    function wrapAsync(asyncFn) {
        if (typeof asyncFn !== 'function') throw new Error('expected a function')
        return isAsync(asyncFn) ? asyncify(asyncFn) : asyncFn;
    }

    // conditionally promisify a function.
    // only return a promise if a callback is omitted
    function awaitify (asyncFn, arity = asyncFn.length) {
        if (!arity) throw new Error('arity is undefined')
        function awaitable (...args) {
            if (typeof args[arity - 1] === 'function') {
                return asyncFn.apply(this, args)
            }

            return new Promise((resolve, reject) => {
                args[arity - 1] = (err, ...cbArgs) => {
                    if (err) return reject(err)
                    resolve(cbArgs.length > 1 ? cbArgs : cbArgs[0]);
                };
                asyncFn.apply(this, args);
            })
        }

        return awaitable
    }

    function applyEach (eachfn) {
        return function applyEach(fns, ...callArgs) {
            const go = awaitify(function (callback) {
                var that = this;
                return eachfn(fns, (fn, cb) => {
                    wrapAsync(fn).apply(that, callArgs.concat(cb));
                }, callback);
            });
            return go;
        };
    }

    function _asyncMap(eachfn, arr, iteratee, callback) {
        arr = arr || [];
        var results = [];
        var counter = 0;
        var _iteratee = wrapAsync(iteratee);

        return eachfn(arr, (value, _, iterCb) => {
            var index = counter++;
            _iteratee(value, (err, v) => {
                results[index] = v;
                iterCb(err);
            });
        }, err => {
            callback(err, results);
        });
    }

    function isArrayLike(value) {
        return value &&
            typeof value.length === 'number' &&
            value.length >= 0 &&
            value.length % 1 === 0;
    }

    // A temporary value used to identify if the loop should be broken.
    // See #1064, #1293
    const breakLoop = {};

    function once(fn) {
        function wrapper (...args) {
            if (fn === null) return;
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
        }
        Object.assign(wrapper, fn);
        return wrapper
    }

    function getIterator (coll) {
        return coll[Symbol.iterator] && coll[Symbol.iterator]();
    }

    function createArrayIterator(coll) {
        var i = -1;
        var len = coll.length;
        return function next() {
            return ++i < len ? {value: coll[i], key: i} : null;
        }
    }

    function createES2015Iterator(iterator) {
        var i = -1;
        return function next() {
            var item = iterator.next();
            if (item.done)
                return null;
            i++;
            return {value: item.value, key: i};
        }
    }

    function createObjectIterator(obj) {
        var okeys = obj ? Object.keys(obj) : [];
        var i = -1;
        var len = okeys.length;
        return function next() {
            var key = okeys[++i];
            if (key === '__proto__') {
                return next();
            }
            return i < len ? {value: obj[key], key} : null;
        };
    }

    function createIterator(coll) {
        if (isArrayLike(coll)) {
            return createArrayIterator(coll);
        }

        var iterator = getIterator(coll);
        return iterator ? createES2015Iterator(iterator) : createObjectIterator(coll);
    }

    function onlyOnce(fn) {
        return function (...args) {
            if (fn === null) throw new Error("Callback was already called.");
            var callFn = fn;
            fn = null;
            callFn.apply(this, args);
        };
    }

    // for async generators
    function asyncEachOfLimit(generator, limit, iteratee, callback) {
        let done = false;
        let canceled = false;
        let awaiting = false;
        let running = 0;
        let idx = 0;

        function replenish() {
            //console.log('replenish')
            if (running >= limit || awaiting || done) return
            //console.log('replenish awaiting')
            awaiting = true;
            generator.next().then(({value, done: iterDone}) => {
                //console.log('got value', value)
                if (canceled || done) return
                awaiting = false;
                if (iterDone) {
                    done = true;
                    if (running <= 0) {
                        //console.log('done nextCb')
                        callback(null);
                    }
                    return;
                }
                running++;
                iteratee(value, idx, iterateeCallback);
                idx++;
                replenish();
            }).catch(handleError);
        }

        function iterateeCallback(err, result) {
            //console.log('iterateeCallback')
            running -= 1;
            if (canceled) return
            if (err) return handleError(err)

            if (err === false) {
                done = true;
                canceled = true;
                return
            }

            if (result === breakLoop || (done && running <= 0)) {
                done = true;
                //console.log('done iterCb')
                return callback(null);
            }
            replenish();
        }

        function handleError(err) {
            if (canceled) return
            awaiting = false;
            done = true;
            callback(err);
        }

        replenish();
    }

    var eachOfLimit = (limit) => {
        return (obj, iteratee, callback) => {
            callback = once(callback);
            if (limit <= 0) {
                throw new RangeError('concurrency limit cannot be less than 1')
            }
            if (!obj) {
                return callback(null);
            }
            if (isAsyncGenerator(obj)) {
                return asyncEachOfLimit(obj, limit, iteratee, callback)
            }
            if (isAsyncIterable(obj)) {
                return asyncEachOfLimit(obj[Symbol.asyncIterator](), limit, iteratee, callback)
            }
            var nextElem = createIterator(obj);
            var done = false;
            var canceled = false;
            var running = 0;
            var looping = false;

            function iterateeCallback(err, value) {
                if (canceled) return
                running -= 1;
                if (err) {
                    done = true;
                    callback(err);
                }
                else if (err === false) {
                    done = true;
                    canceled = true;
                }
                else if (value === breakLoop || (done && running <= 0)) {
                    done = true;
                    return callback(null);
                }
                else if (!looping) {
                    replenish();
                }
            }

            function replenish () {
                looping = true;
                while (running < limit && !done) {
                    var elem = nextElem();
                    if (elem === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iteratee(elem.value, elem.key, onlyOnce(iterateeCallback));
                }
                looping = false;
            }

            replenish();
        };
    };

    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name eachOfLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`. The `key` is the item's key, or index in the case of an
     * array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachOfLimit$1(coll, limit, iteratee, callback) {
        return eachOfLimit(limit)(coll, wrapAsync(iteratee), callback);
    }

    var eachOfLimit$2 = awaitify(eachOfLimit$1, 4);

    // eachOf implementation optimized for array-likes
    function eachOfArrayLike(coll, iteratee, callback) {
        callback = once(callback);
        var index = 0,
            completed = 0,
            {length} = coll,
            canceled = false;
        if (length === 0) {
            callback(null);
        }

        function iteratorCallback(err, value) {
            if (err === false) {
                canceled = true;
            }
            if (canceled === true) return
            if (err) {
                callback(err);
            } else if ((++completed === length) || value === breakLoop) {
                callback(null);
            }
        }

        for (; index < length; index++) {
            iteratee(coll[index], index, onlyOnce(iteratorCallback));
        }
    }

    // a generic version of eachOf which can handle array, object, and iterator cases.
    function eachOfGeneric (coll, iteratee, callback) {
        return eachOfLimit$2(coll, Infinity, iteratee, callback);
    }

    /**
     * Like [`each`]{@link module:Collections.each}, except that it passes the key (or index) as the second argument
     * to the iteratee.
     *
     * @name eachOf
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEachOf
     * @category Collection
     * @see [async.each]{@link module:Collections.each}
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each
     * item in `coll`.
     * The `key` is the item's key, or index in the case of an array.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dev.json is a file containing a valid json object config for dev environment
     * // dev.json is a file containing a valid json object config for test environment
     * // prod.json is a file containing a valid json object config for prod environment
     * // invalid.json is a file with a malformed json object
     *
     * let configs = {}; //global variable
     * let validConfigFileMap = {dev: 'dev.json', test: 'test.json', prod: 'prod.json'};
     * let invalidConfigFileMap = {dev: 'dev.json', test: 'test.json', invalid: 'invalid.json'};
     *
     * // asynchronous function that reads a json file and parses the contents as json object
     * function parseFile(file, key, callback) {
     *     fs.readFile(file, "utf8", function(err, data) {
     *         if (err) return calback(err);
     *         try {
     *             configs[key] = JSON.parse(data);
     *         } catch (e) {
     *             return callback(e);
     *         }
     *         callback();
     *     });
     * }
     *
     * // Using callbacks
     * async.forEachOf(validConfigFileMap, parseFile, function (err) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log(configs);
     *         // configs is now a map of JSON data, e.g.
     *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     *     }
     * });
     *
     * //Error handing
     * async.forEachOf(invalidConfigFileMap, parseFile, function (err) {
     *     if (err) {
     *         console.error(err);
     *         // JSON parse error exception
     *     } else {
     *         console.log(configs);
     *     }
     * });
     *
     * // Using Promises
     * async.forEachOf(validConfigFileMap, parseFile)
     * .then( () => {
     *     console.log(configs);
     *     // configs is now a map of JSON data, e.g.
     *     // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     * }).catch( err => {
     *     console.error(err);
     * });
     *
     * //Error handing
     * async.forEachOf(invalidConfigFileMap, parseFile)
     * .then( () => {
     *     console.log(configs);
     * }).catch( err => {
     *     console.error(err);
     *     // JSON parse error exception
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.forEachOf(validConfigFileMap, parseFile);
     *         console.log(configs);
     *         // configs is now a map of JSON data, e.g.
     *         // { dev: //parsed dev.json, test: //parsed test.json, prod: //parsed prod.json}
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * //Error handing
     * async () => {
     *     try {
     *         let result = await async.forEachOf(invalidConfigFileMap, parseFile);
     *         console.log(configs);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // JSON parse error exception
     *     }
     * }
     *
     */
    function eachOf(coll, iteratee, callback) {
        var eachOfImplementation = isArrayLike(coll) ? eachOfArrayLike : eachOfGeneric;
        return eachOfImplementation(coll, wrapAsync(iteratee), callback);
    }

    var eachOf$1 = awaitify(eachOf, 3);

    /**
     * Produces a new collection of values by mapping each value in `coll` through
     * the `iteratee` function. The `iteratee` is called with an item from `coll`
     * and a callback for when it has finished processing. Each of these callbacks
     * takes 2 arguments: an `error`, and the transformed item from `coll`. If
     * `iteratee` passes an error to its callback, the main `callback` (for the
     * `map` function) is immediately called with the error.
     *
     * Note, that since this function applies the `iteratee` to each item in
     * parallel, there is no guarantee that the `iteratee` functions will complete
     * in order. However, the results array will be in the same order as the
     * original `coll`.
     *
     * If `map` is passed an Object, the results will be an Array.  The results
     * will roughly be in the order of the original Objects' keys (but this can
     * vary across JavaScript engines).
     *
     * @name map
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an Array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.map(fileList, getFileSizeInBytes, function(err, results) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(results);
     *         // results is now an array of the file size in bytes for each file, e.g.
     *         // [ 1000, 2000, 3000]
     *     }
     * });
     *
     * // Error Handling
     * async.map(withMissingFileList, getFileSizeInBytes, function(err, results) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(results);
     *     }
     * });
     *
     * // Using Promises
     * async.map(fileList, getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     *     // results is now an array of the file size in bytes for each file, e.g.
     *     // [ 1000, 2000, 3000]
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.map(withMissingFileList, getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.map(fileList, getFileSizeInBytes);
     *         console.log(results);
     *         // results is now an array of the file size in bytes for each file, e.g.
     *         // [ 1000, 2000, 3000]
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let results = await async.map(withMissingFileList, getFileSizeInBytes);
     *         console.log(results);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function map (coll, iteratee, callback) {
        return _asyncMap(eachOf$1, coll, iteratee, callback)
    }
    var map$1 = awaitify(map, 3);

    /**
     * Applies the provided arguments to each function in the array, calling
     * `callback` after all functions have completed. If you only provide the first
     * argument, `fns`, then it will return a function which lets you pass in the
     * arguments as if it were a single function call. If more arguments are
     * provided, `callback` is required while `args` is still optional. The results
     * for each of the applied async functions are passed to the final callback
     * as an array.
     *
     * @name applyEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s
     * to all call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {AsyncFunction} - Returns a function that takes no args other than
     * an optional callback, that is the result of applying the `args` to each
     * of the functions.
     * @example
     *
     * const appliedFn = async.applyEach([enableSearch, updateSchema], 'bucket')
     *
     * appliedFn((err, results) => {
     *     // results[0] is the results for `enableSearch`
     *     // results[1] is the results for `updateSchema`
     * });
     *
     * // partial application example:
     * async.each(
     *     buckets,
     *     async (bucket) => async.applyEach([enableSearch, updateSchema], bucket)(),
     *     callback
     * );
     */
    var applyEach$1 = applyEach(map$1);

    /**
     * The same as [`eachOf`]{@link module:Collections.eachOf} but runs only a single async operation at a time.
     *
     * @name eachOfSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.eachOf]{@link module:Collections.eachOf}
     * @alias forEachOfSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * Invoked with (item, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachOfSeries(coll, iteratee, callback) {
        return eachOfLimit$2(coll, 1, iteratee, callback)
    }
    var eachOfSeries$1 = awaitify(eachOfSeries, 3);

    /**
     * The same as [`map`]{@link module:Collections.map} but runs only a single async operation at a time.
     *
     * @name mapSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapSeries (coll, iteratee, callback) {
        return _asyncMap(eachOfSeries$1, coll, iteratee, callback)
    }
    var mapSeries$1 = awaitify(mapSeries, 3);

    /**
     * The same as [`applyEach`]{@link module:ControlFlow.applyEach} but runs only a single async operation at a time.
     *
     * @name applyEachSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.applyEach]{@link module:ControlFlow.applyEach}
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} fns - A collection of {@link AsyncFunction}s to all
     * call with the same arguments
     * @param {...*} [args] - any number of separate arguments to pass to the
     * function.
     * @param {Function} [callback] - the final argument should be the callback,
     * called when all functions have completed processing.
     * @returns {AsyncFunction} - A function, that when called, is the result of
     * appling the `args` to the list of functions.  It takes no args, other than
     * a callback.
     */
    var applyEachSeries = applyEach(mapSeries$1);

    const PROMISE_SYMBOL = Symbol('promiseCallback');

    function promiseCallback () {
        let resolve, reject;
        function callback (err, ...args) {
            if (err) return reject(err)
            resolve(args.length > 1 ? args : args[0]);
        }

        callback[PROMISE_SYMBOL] = new Promise((res, rej) => {
            resolve = res,
            reject = rej;
        });

        return callback
    }

    /**
     * Determines the best order for running the {@link AsyncFunction}s in `tasks`, based on
     * their requirements. Each function can optionally depend on other functions
     * being completed first, and each function is run as soon as its requirements
     * are satisfied.
     *
     * If any of the {@link AsyncFunction}s pass an error to their callback, the `auto` sequence
     * will stop. Further tasks will not execute (so any other functions depending
     * on it will not run), and the main `callback` is immediately called with the
     * error.
     *
     * {@link AsyncFunction}s also receive an object containing the results of functions which
     * have completed so far as the first argument, if they have dependencies. If a
     * task function has no dependencies, it will only be passed a callback.
     *
     * @name auto
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Object} tasks - An object. Each of its properties is either a
     * function or an array of requirements, with the {@link AsyncFunction} itself the last item
     * in the array. The object's key of a property serves as the name of the task
     * defined by that property, i.e. can be used when specifying requirements for
     * other tasks. The function receives one or two arguments:
     * * a `results` object, containing the results of the previously executed
     *   functions, only passed if the task has any dependencies,
     * * a `callback(err, result)` function, which must be called when finished,
     *   passing an `error` (which can be `null`) and the result of the function's
     *   execution.
     * @param {number} [concurrency=Infinity] - An optional `integer` for
     * determining the maximum number of tasks that can be run in parallel. By
     * default, as many as possible.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback. Results are always returned; however, if an
     * error occurs, no further `tasks` will be performed, and the results object
     * will only contain partial results. Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     * @example
     *
     * //Using Callbacks
     * async.auto({
     *     get_data: function(callback) {
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: ['get_data', 'make_folder', function(results, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(results, callback) {
     *         // once the file is written let's email a link to it...
     *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *     }]
     * }, function(err, results) {
     *     if (err) {
     *         console.log('err = ', err);
     *     }
     *     console.log('results = ', results);
     *     // results = {
     *     //     get_data: ['data', 'converted to array']
     *     //     make_folder; 'folder',
     *     //     write_file: 'filename'
     *     //     email_link: { file: 'filename', email: 'user@example.com' }
     *     // }
     * });
     *
     * //Using Promises
     * async.auto({
     *     get_data: function(callback) {
     *         console.log('in get_data');
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         console.log('in make_folder');
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: ['get_data', 'make_folder', function(results, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(results, callback) {
     *         // once the file is written let's email a link to it...
     *         callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *     }]
     * }).then(results => {
     *     console.log('results = ', results);
     *     // results = {
     *     //     get_data: ['data', 'converted to array']
     *     //     make_folder; 'folder',
     *     //     write_file: 'filename'
     *     //     email_link: { file: 'filename', email: 'user@example.com' }
     *     // }
     * }).catch(err => {
     *     console.log('err = ', err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.auto({
     *             get_data: function(callback) {
     *                 // async code to get some data
     *                 callback(null, 'data', 'converted to array');
     *             },
     *             make_folder: function(callback) {
     *                 // async code to create a directory to store a file in
     *                 // this is run at the same time as getting the data
     *                 callback(null, 'folder');
     *             },
     *             write_file: ['get_data', 'make_folder', function(results, callback) {
     *                 // once there is some data and the directory exists,
     *                 // write the data to a file in the directory
     *                 callback(null, 'filename');
     *             }],
     *             email_link: ['write_file', function(results, callback) {
     *                 // once the file is written let's email a link to it...
     *                 callback(null, {'file':results.write_file, 'email':'user@example.com'});
     *             }]
     *         });
     *         console.log('results = ', results);
     *         // results = {
     *         //     get_data: ['data', 'converted to array']
     *         //     make_folder; 'folder',
     *         //     write_file: 'filename'
     *         //     email_link: { file: 'filename', email: 'user@example.com' }
     *         // }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function auto(tasks, concurrency, callback) {
        if (typeof concurrency !== 'number') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = once(callback || promiseCallback());
        var numTasks = Object.keys(tasks).length;
        if (!numTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = numTasks;
        }

        var results = {};
        var runningTasks = 0;
        var canceled = false;
        var hasError = false;

        var listeners = Object.create(null);

        var readyTasks = [];

        // for cycle detection:
        var readyToCheck = []; // tasks that have been identified as reachable
        // without the possibility of returning to an ancestor task
        var uncheckedDependencies = {};

        Object.keys(tasks).forEach(key => {
            var task = tasks[key];
            if (!Array.isArray(task)) {
                // no dependencies
                enqueueTask(key, [task]);
                readyToCheck.push(key);
                return;
            }

            var dependencies = task.slice(0, task.length - 1);
            var remainingDependencies = dependencies.length;
            if (remainingDependencies === 0) {
                enqueueTask(key, task);
                readyToCheck.push(key);
                return;
            }
            uncheckedDependencies[key] = remainingDependencies;

            dependencies.forEach(dependencyName => {
                if (!tasks[dependencyName]) {
                    throw new Error('async.auto task `' + key +
                        '` has a non-existent dependency `' +
                        dependencyName + '` in ' +
                        dependencies.join(', '));
                }
                addListener(dependencyName, () => {
                    remainingDependencies--;
                    if (remainingDependencies === 0) {
                        enqueueTask(key, task);
                    }
                });
            });
        });

        checkForDeadlocks();
        processQueue();

        function enqueueTask(key, task) {
            readyTasks.push(() => runTask(key, task));
        }

        function processQueue() {
            if (canceled) return
            if (readyTasks.length === 0 && runningTasks === 0) {
                return callback(null, results);
            }
            while(readyTasks.length && runningTasks < concurrency) {
                var run = readyTasks.shift();
                run();
            }

        }

        function addListener(taskName, fn) {
            var taskListeners = listeners[taskName];
            if (!taskListeners) {
                taskListeners = listeners[taskName] = [];
            }

            taskListeners.push(fn);
        }

        function taskComplete(taskName) {
            var taskListeners = listeners[taskName] || [];
            taskListeners.forEach(fn => fn());
            processQueue();
        }


        function runTask(key, task) {
            if (hasError) return;

            var taskCallback = onlyOnce((err, ...result) => {
                runningTasks--;
                if (err === false) {
                    canceled = true;
                    return
                }
                if (result.length < 2) {
                    [result] = result;
                }
                if (err) {
                    var safeResults = {};
                    Object.keys(results).forEach(rkey => {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[key] = result;
                    hasError = true;
                    listeners = Object.create(null);
                    if (canceled) return
                    callback(err, safeResults);
                } else {
                    results[key] = result;
                    taskComplete(key);
                }
            });

            runningTasks++;
            var taskFn = wrapAsync(task[task.length - 1]);
            if (task.length > 1) {
                taskFn(results, taskCallback);
            } else {
                taskFn(taskCallback);
            }
        }

        function checkForDeadlocks() {
            // Kahn's algorithm
            // https://en.wikipedia.org/wiki/Topological_sorting#Kahn.27s_algorithm
            // http://connalle.blogspot.com/2013/10/topological-sortingkahn-algorithm.html
            var currentTask;
            var counter = 0;
            while (readyToCheck.length) {
                currentTask = readyToCheck.pop();
                counter++;
                getDependents(currentTask).forEach(dependent => {
                    if (--uncheckedDependencies[dependent] === 0) {
                        readyToCheck.push(dependent);
                    }
                });
            }

            if (counter !== numTasks) {
                throw new Error(
                    'async.auto cannot execute tasks due to a recursive dependency'
                );
            }
        }

        function getDependents(taskName) {
            var result = [];
            Object.keys(tasks).forEach(key => {
                const task = tasks[key];
                if (Array.isArray(task) && task.indexOf(taskName) >= 0) {
                    result.push(key);
                }
            });
            return result;
        }

        return callback[PROMISE_SYMBOL]
    }

    var FN_ARGS = /^(?:async\s+)?(?:function)?\s*\w*\s*\(\s*([^)]+)\s*\)(?:\s*{)/;
    var ARROW_FN_ARGS = /^(?:async\s+)?\(?\s*([^)=]+)\s*\)?(?:\s*=>)/;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /(=.+)?(\s*)$/;

    function stripComments(string) {
        let stripped = '';
        let index = 0;
        let endBlockComment = string.indexOf('*/');
        while (index < string.length) {
            if (string[index] === '/' && string[index+1] === '/') {
                // inline comment
                let endIndex = string.indexOf('\n', index);
                index = (endIndex === -1) ? string.length : endIndex;
            } else if ((endBlockComment !== -1) && (string[index] === '/') && (string[index+1] === '*')) {
                // block comment
                let endIndex = string.indexOf('*/', index);
                if (endIndex !== -1) {
                    index = endIndex + 2;
                    endBlockComment = string.indexOf('*/', index);
                } else {
                    stripped += string[index];
                    index++;
                }
            } else {
                stripped += string[index];
                index++;
            }
        }
        return stripped;
    }

    function parseParams(func) {
        const src = stripComments(func.toString());
        let match = src.match(FN_ARGS);
        if (!match) {
            match = src.match(ARROW_FN_ARGS);
        }
        if (!match) throw new Error('could not parse args in autoInject\nSource:\n' + src)
        let [, args] = match;
        return args
            .replace(/\s/g, '')
            .split(FN_ARG_SPLIT)
            .map((arg) => arg.replace(FN_ARG, '').trim());
    }

    /**
     * A dependency-injected version of the [async.auto]{@link module:ControlFlow.auto} function. Dependent
     * tasks are specified as parameters to the function, after the usual callback
     * parameter, with the parameter names matching the names of the tasks it
     * depends on. This can provide even more readable task graphs which can be
     * easier to maintain.
     *
     * If a final callback is specified, the task results are similarly injected,
     * specified as named parameters after the initial error parameter.
     *
     * The autoInject function is purely syntactic sugar and its semantics are
     * otherwise equivalent to [async.auto]{@link module:ControlFlow.auto}.
     *
     * @name autoInject
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.auto]{@link module:ControlFlow.auto}
     * @category Control Flow
     * @param {Object} tasks - An object, each of whose properties is an {@link AsyncFunction} of
     * the form 'func([dependencies...], callback). The object's key of a property
     * serves as the name of the task defined by that property, i.e. can be used
     * when specifying requirements for other tasks.
     * * The `callback` parameter is a `callback(err, result)` which must be called
     *   when finished, passing an `error` (which can be `null`) and the result of
     *   the function's execution. The remaining parameters name other tasks on
     *   which the task is dependent, and the results from those tasks are the
     *   arguments of those parameters.
     * @param {Function} [callback] - An optional callback which is called when all
     * the tasks have been completed. It receives the `err` argument if any `tasks`
     * pass an error to their callback, and a `results` object with any completed
     * task results, similar to `auto`.
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * //  The example from `auto` can be rewritten as follows:
     * async.autoInject({
     *     get_data: function(callback) {
     *         // async code to get some data
     *         callback(null, 'data', 'converted to array');
     *     },
     *     make_folder: function(callback) {
     *         // async code to create a directory to store a file in
     *         // this is run at the same time as getting the data
     *         callback(null, 'folder');
     *     },
     *     write_file: function(get_data, make_folder, callback) {
     *         // once there is some data and the directory exists,
     *         // write the data to a file in the directory
     *         callback(null, 'filename');
     *     },
     *     email_link: function(write_file, callback) {
     *         // once the file is written let's email a link to it...
     *         // write_file contains the filename returned by write_file.
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     *
     * // If you are using a JS minifier that mangles parameter names, `autoInject`
     * // will not work with plain functions, since the parameter names will be
     * // collapsed to a single letter identifier.  To work around this, you can
     * // explicitly specify the names of the parameters your task function needs
     * // in an array, similar to Angular.js dependency injection.
     *
     * // This still has an advantage over plain `auto`, since the results a task
     * // depends on are still spread into arguments.
     * async.autoInject({
     *     //...
     *     write_file: ['get_data', 'make_folder', function(get_data, make_folder, callback) {
     *         callback(null, 'filename');
     *     }],
     *     email_link: ['write_file', function(write_file, callback) {
     *         callback(null, {'file':write_file, 'email':'user@example.com'});
     *     }]
     *     //...
     * }, function(err, results) {
     *     console.log('err = ', err);
     *     console.log('email_link = ', results.email_link);
     * });
     */
    function autoInject(tasks, callback) {
        var newTasks = {};

        Object.keys(tasks).forEach(key => {
            var taskFn = tasks[key];
            var params;
            var fnIsAsync = isAsync(taskFn);
            var hasNoDeps =
                (!fnIsAsync && taskFn.length === 1) ||
                (fnIsAsync && taskFn.length === 0);

            if (Array.isArray(taskFn)) {
                params = [...taskFn];
                taskFn = params.pop();

                newTasks[key] = params.concat(params.length > 0 ? newTask : taskFn);
            } else if (hasNoDeps) {
                // no dependencies, use the function as-is
                newTasks[key] = taskFn;
            } else {
                params = parseParams(taskFn);
                if ((taskFn.length === 0 && !fnIsAsync) && params.length === 0) {
                    throw new Error("autoInject task functions require explicit parameters.");
                }

                // remove callback param
                if (!fnIsAsync) params.pop();

                newTasks[key] = params.concat(newTask);
            }

            function newTask(results, taskCb) {
                var newArgs = params.map(name => results[name]);
                newArgs.push(taskCb);
                wrapAsync(taskFn)(...newArgs);
            }
        });

        return auto(newTasks, callback);
    }

    // Simple doubly linked list (https://en.wikipedia.org/wiki/Doubly_linked_list) implementation
    // used for queues. This implementation assumes that the node provided by the user can be modified
    // to adjust the next and last properties. We implement only the minimal functionality
    // for queue support.
    class DLL {
        constructor() {
            this.head = this.tail = null;
            this.length = 0;
        }

        removeLink(node) {
            if (node.prev) node.prev.next = node.next;
            else this.head = node.next;
            if (node.next) node.next.prev = node.prev;
            else this.tail = node.prev;

            node.prev = node.next = null;
            this.length -= 1;
            return node;
        }

        empty () {
            while(this.head) this.shift();
            return this;
        }

        insertAfter(node, newNode) {
            newNode.prev = node;
            newNode.next = node.next;
            if (node.next) node.next.prev = newNode;
            else this.tail = newNode;
            node.next = newNode;
            this.length += 1;
        }

        insertBefore(node, newNode) {
            newNode.prev = node.prev;
            newNode.next = node;
            if (node.prev) node.prev.next = newNode;
            else this.head = newNode;
            node.prev = newNode;
            this.length += 1;
        }

        unshift(node) {
            if (this.head) this.insertBefore(this.head, node);
            else setInitial(this, node);
        }

        push(node) {
            if (this.tail) this.insertAfter(this.tail, node);
            else setInitial(this, node);
        }

        shift() {
            return this.head && this.removeLink(this.head);
        }

        pop() {
            return this.tail && this.removeLink(this.tail);
        }

        toArray() {
            return [...this]
        }

        *[Symbol.iterator] () {
            var cur = this.head;
            while (cur) {
                yield cur.data;
                cur = cur.next;
            }
        }

        remove (testFn) {
            var curr = this.head;
            while(curr) {
                var {next} = curr;
                if (testFn(curr)) {
                    this.removeLink(curr);
                }
                curr = next;
            }
            return this;
        }
    }

    function setInitial(dll, node) {
        dll.length = 1;
        dll.head = dll.tail = node;
    }

    function queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new RangeError('Concurrency must not be zero');
        }

        var _worker = wrapAsync(worker);
        var numRunning = 0;
        var workersList = [];
        const events = {
            error: [],
            drain: [],
            saturated: [],
            unsaturated: [],
            empty: []
        };

        function on (event, handler) {
            events[event].push(handler);
        }

        function once (event, handler) {
            const handleAndRemove = (...args) => {
                off(event, handleAndRemove);
                handler(...args);
            };
            events[event].push(handleAndRemove);
        }

        function off (event, handler) {
            if (!event) return Object.keys(events).forEach(ev => events[ev] = [])
            if (!handler) return events[event] = []
            events[event] = events[event].filter(ev => ev !== handler);
        }

        function trigger (event, ...args) {
            events[event].forEach(handler => handler(...args));
        }

        var processingScheduled = false;
        function _insert(data, insertAtFront, rejectOnError, callback) {
            if (callback != null && typeof callback !== 'function') {
                throw new Error('task callback must be a function');
            }
            q.started = true;

            var res, rej;
            function promiseCallback (err, ...args) {
                // we don't care about the error, let the global error handler
                // deal with it
                if (err) return rejectOnError ? rej(err) : res()
                if (args.length <= 1) return res(args[0])
                res(args);
            }

            var item = q._createTaskItem(
                data,
                rejectOnError ? promiseCallback :
                    (callback || promiseCallback)
            );

            if (insertAtFront) {
                q._tasks.unshift(item);
            } else {
                q._tasks.push(item);
            }

            if (!processingScheduled) {
                processingScheduled = true;
                setImmediate$1(() => {
                    processingScheduled = false;
                    q.process();
                });
            }

            if (rejectOnError || !callback) {
                return new Promise((resolve, reject) => {
                    res = resolve;
                    rej = reject;
                })
            }
        }

        function _createCB(tasks) {
            return function (err, ...args) {
                numRunning -= 1;

                for (var i = 0, l = tasks.length; i < l; i++) {
                    var task = tasks[i];

                    var index = workersList.indexOf(task);
                    if (index === 0) {
                        workersList.shift();
                    } else if (index > 0) {
                        workersList.splice(index, 1);
                    }

                    task.callback(err, ...args);

                    if (err != null) {
                        trigger('error', err, task.data);
                    }
                }

                if (numRunning <= (q.concurrency - q.buffer) ) {
                    trigger('unsaturated');
                }

                if (q.idle()) {
                    trigger('drain');
                }
                q.process();
            };
        }

        function _maybeDrain(data) {
            if (data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                setImmediate$1(() => trigger('drain'));
                return true
            }
            return false
        }

        const eventMethod = (name) => (handler) => {
            if (!handler) {
                return new Promise((resolve, reject) => {
                    once(name, (err, data) => {
                        if (err) return reject(err)
                        resolve(data);
                    });
                })
            }
            off(name);
            on(name, handler);

        };

        var isProcessing = false;
        var q = {
            _tasks: new DLL(),
            _createTaskItem (data, callback) {
                return {
                    data,
                    callback
                };
            },
            *[Symbol.iterator] () {
                yield* q._tasks[Symbol.iterator]();
            },
            concurrency,
            payload,
            buffer: concurrency / 4,
            started: false,
            paused: false,
            push (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, false, false, callback))
                }
                return _insert(data, false, false, callback);
            },
            pushAsync (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, false, true, callback))
                }
                return _insert(data, false, true, callback);
            },
            kill () {
                off();
                q._tasks.empty();
            },
            unshift (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, true, false, callback))
                }
                return _insert(data, true, false, callback);
            },
            unshiftAsync (data, callback) {
                if (Array.isArray(data)) {
                    if (_maybeDrain(data)) return
                    return data.map(datum => _insert(datum, true, true, callback))
                }
                return _insert(data, true, true, callback);
            },
            remove (testFn) {
                q._tasks.remove(testFn);
            },
            process () {
                // Avoid trying to start too many processing operations. This can occur
                // when callbacks resolve synchronously (#1267).
                if (isProcessing) {
                    return;
                }
                isProcessing = true;
                while(!q.paused && numRunning < q.concurrency && q._tasks.length){
                    var tasks = [], data = [];
                    var l = q._tasks.length;
                    if (q.payload) l = Math.min(l, q.payload);
                    for (var i = 0; i < l; i++) {
                        var node = q._tasks.shift();
                        tasks.push(node);
                        workersList.push(node);
                        data.push(node.data);
                    }

                    numRunning += 1;

                    if (q._tasks.length === 0) {
                        trigger('empty');
                    }

                    if (numRunning === q.concurrency) {
                        trigger('saturated');
                    }

                    var cb = onlyOnce(_createCB(tasks));
                    _worker(data, cb);
                }
                isProcessing = false;
            },
            length () {
                return q._tasks.length;
            },
            running () {
                return numRunning;
            },
            workersList () {
                return workersList;
            },
            idle() {
                return q._tasks.length + numRunning === 0;
            },
            pause () {
                q.paused = true;
            },
            resume () {
                if (q.paused === false) { return; }
                q.paused = false;
                setImmediate$1(q.process);
            }
        };
        // define these as fixed properties, so people get useful errors when updating
        Object.defineProperties(q, {
            saturated: {
                writable: false,
                value: eventMethod('saturated')
            },
            unsaturated: {
                writable: false,
                value: eventMethod('unsaturated')
            },
            empty: {
                writable: false,
                value: eventMethod('empty')
            },
            drain: {
                writable: false,
                value: eventMethod('drain')
            },
            error: {
                writable: false,
                value: eventMethod('error')
            },
        });
        return q;
    }

    /**
     * Creates a `cargo` object with the specified payload. Tasks added to the
     * cargo will be processed altogether (up to the `payload` limit). If the
     * `worker` is in progress, the task is queued until it becomes available. Once
     * the `worker` has completed some tasks, each callback of those tasks is
     * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
     * for how `cargo` and `queue` work.
     *
     * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
     * at a time, cargo passes an array of tasks to a single worker, repeating
     * when the worker is finished.
     *
     * @name cargo
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An asynchronous function for processing an array
     * of queued tasks. Invoked with `(tasks, callback)`.
     * @param {number} [payload=Infinity] - An optional `integer` for determining
     * how many tasks should be processed per round; if omitted, the default is
     * unlimited.
     * @returns {module:ControlFlow.QueueObject} A cargo object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the cargo and inner queue.
     * @example
     *
     * // create a cargo object with payload 2
     * var cargo = async.cargo(function(tasks, callback) {
     *     for (var i=0; i<tasks.length; i++) {
     *         console.log('hello ' + tasks[i].name);
     *     }
     *     callback();
     * }, 2);
     *
     * // add some items
     * cargo.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * cargo.push({name: 'bar'}, function(err) {
     *     console.log('finished processing bar');
     * });
     * await cargo.push({name: 'baz'});
     * console.log('finished processing baz');
     */
    function cargo(worker, payload) {
        return queue(worker, 1, payload);
    }

    /**
     * Creates a `cargoQueue` object with the specified payload. Tasks added to the
     * cargoQueue will be processed together (up to the `payload` limit) in `concurrency` parallel workers.
     * If the all `workers` are in progress, the task is queued until one becomes available. Once
     * a `worker` has completed some tasks, each callback of those tasks is
     * called. Check out [these](https://camo.githubusercontent.com/6bbd36f4cf5b35a0f11a96dcd2e97711ffc2fb37/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130382f62626330636662302d356632392d313165322d393734662d3333393763363464633835382e676966) [animations](https://camo.githubusercontent.com/f4810e00e1c5f5f8addbe3e9f49064fd5d102699/68747470733a2f2f662e636c6f75642e6769746875622e636f6d2f6173736574732f313637363837312f36383130312f38346339323036362d356632392d313165322d383134662d3964336430323431336266642e676966)
     * for how `cargo` and `queue` work.
     *
     * While [`queue`]{@link module:ControlFlow.queue} passes only one task to one of a group of workers
     * at a time, and [`cargo`]{@link module:ControlFlow.cargo} passes an array of tasks to a single worker,
     * the cargoQueue passes an array of tasks to multiple parallel workers.
     *
     * @name cargoQueue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @see [async.cargo]{@link module:ControlFLow.cargo}
     * @category Control Flow
     * @param {AsyncFunction} worker - An asynchronous function for processing an array
     * of queued tasks. Invoked with `(tasks, callback)`.
     * @param {number} [concurrency=1] - An `integer` for determining how many
     * `worker` functions should be run in parallel.  If omitted, the concurrency
     * defaults to `1`.  If the concurrency is `0`, an error is thrown.
     * @param {number} [payload=Infinity] - An optional `integer` for determining
     * how many tasks should be processed per round; if omitted, the default is
     * unlimited.
     * @returns {module:ControlFlow.QueueObject} A cargoQueue object to manage the tasks. Callbacks can
     * attached as certain properties to listen for specific events during the
     * lifecycle of the cargoQueue and inner queue.
     * @example
     *
     * // create a cargoQueue object with payload 2 and concurrency 2
     * var cargoQueue = async.cargoQueue(function(tasks, callback) {
     *     for (var i=0; i<tasks.length; i++) {
     *         console.log('hello ' + tasks[i].name);
     *     }
     *     callback();
     * }, 2, 2);
     *
     * // add some items
     * cargoQueue.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * cargoQueue.push({name: 'bar'}, function(err) {
     *     console.log('finished processing bar');
     * });
     * cargoQueue.push({name: 'baz'}, function(err) {
     *     console.log('finished processing baz');
     * });
     * cargoQueue.push({name: 'boo'}, function(err) {
     *     console.log('finished processing boo');
     * });
     */
    function cargo$1(worker, concurrency, payload) {
        return queue(worker, concurrency, payload);
    }

    /**
     * Reduces `coll` into a single value using an async `iteratee` to return each
     * successive step. `memo` is the initial state of the reduction. This function
     * only operates in series.
     *
     * For performance reasons, it may make sense to split a call to this function
     * into a parallel map, and then use the normal `Array.prototype.reduce` on the
     * results. This function is for situations where each step in the reduction
     * needs to be async; if you can get the data before reducing it, then it's
     * probably a good idea to do so.
     *
     * @name reduce
     * @static
     * @memberOf module:Collections
     * @method
     * @alias inject
     * @alias foldl
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee completes with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file3.txt', 'file4.txt'];
     *
     * // asynchronous function that computes the file size in bytes
     * // file size is added to the memoized value, then returned
     * function getFileSizeInBytes(memo, file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, memo + stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.reduce(fileList, 0, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // 6000
     *         // which is the sum of the file sizes of the three files
     *     }
     * });
     *
     * // Error Handling
     * async.reduce(withMissingFileList, 0, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(result);
     *     }
     * });
     *
     * // Using Promises
     * async.reduce(fileList, 0, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     *     // 6000
     *     // which is the sum of the file sizes of the three files
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.reduce(withMissingFileList, 0, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.reduce(fileList, 0, getFileSizeInBytes);
     *         console.log(result);
     *         // 6000
     *         // which is the sum of the file sizes of the three files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let result = await async.reduce(withMissingFileList, 0, getFileSizeInBytes);
     *         console.log(result);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function reduce(coll, memo, iteratee, callback) {
        callback = once(callback);
        var _iteratee = wrapAsync(iteratee);
        return eachOfSeries$1(coll, (x, i, iterCb) => {
            _iteratee(memo, x, (err, v) => {
                memo = v;
                iterCb(err);
            });
        }, err => callback(err, memo));
    }
    var reduce$1 = awaitify(reduce, 4);

    /**
     * Version of the compose function that is more natural to read. Each function
     * consumes the return value of the previous function. It is the equivalent of
     * [compose]{@link module:ControlFlow.compose} with the arguments reversed.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name seq
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.compose]{@link module:ControlFlow.compose}
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} a function that composes the `functions` in order
     * @example
     *
     * // Requires lodash (or underscore), express3 and dresende's orm2.
     * // Part of an app, that fetches cats of the logged user.
     * // This example uses `seq` function to avoid overnesting and error
     * // handling clutter.
     * app.get('/cats', function(request, response) {
     *     var User = request.models.User;
     *     async.seq(
     *         User.get.bind(User),  // 'User.get' has signature (id, callback(err, data))
     *         function(user, fn) {
     *             user.getCats(fn);      // 'getCats' has signature (callback(err, data))
     *         }
     *     )(req.session.user_id, function (err, cats) {
     *         if (err) {
     *             console.error(err);
     *             response.json({ status: 'error', message: err.message });
     *         } else {
     *             response.json({ status: 'ok', message: 'Cats found', data: cats });
     *         }
     *     });
     * });
     */
    function seq(...functions) {
        var _functions = functions.map(wrapAsync);
        return function (...args) {
            var that = this;

            var cb = args[args.length - 1];
            if (typeof cb == 'function') {
                args.pop();
            } else {
                cb = promiseCallback();
            }

            reduce$1(_functions, args, (newargs, fn, iterCb) => {
                fn.apply(that, newargs.concat((err, ...nextargs) => {
                    iterCb(err, nextargs);
                }));
            },
            (err, results) => cb(err, ...results));

            return cb[PROMISE_SYMBOL]
        };
    }

    /**
     * Creates a function which is a composition of the passed asynchronous
     * functions. Each function consumes the return value of the function that
     * follows. Composing functions `f()`, `g()`, and `h()` would produce the result
     * of `f(g(h()))`, only this version uses callbacks to obtain the return values.
     *
     * If the last argument to the composed function is not a function, a promise
     * is returned when you call it.
     *
     * Each function is executed with the `this` binding of the composed function.
     *
     * @name compose
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {...AsyncFunction} functions - the asynchronous functions to compose
     * @returns {Function} an asynchronous function that is the composed
     * asynchronous `functions`
     * @example
     *
     * function add1(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n + 1);
     *     }, 10);
     * }
     *
     * function mul3(n, callback) {
     *     setTimeout(function () {
     *         callback(null, n * 3);
     *     }, 10);
     * }
     *
     * var add1mul3 = async.compose(mul3, add1);
     * add1mul3(4, function (err, result) {
     *     // result now equals 15
     * });
     */
    function compose(...args) {
        return seq(...args.reverse());
    }

    /**
     * The same as [`map`]{@link module:Collections.map} but runs a maximum of `limit` async operations at a time.
     *
     * @name mapLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with the transformed item.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Results is an array of the
     * transformed items from the `coll`. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapLimit (coll, limit, iteratee, callback) {
        return _asyncMap(eachOfLimit(limit), coll, iteratee, callback)
    }
    var mapLimit$1 = awaitify(mapLimit, 4);

    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs a maximum of `limit` async operations at a time.
     *
     * @name concatLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @alias flatMapLimit
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     */
    function concatLimit(coll, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, ...args) => {
                if (err) return iterCb(err);
                return iterCb(err, args);
            });
        }, (err, mapResults) => {
            var result = [];
            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    result = result.concat(...mapResults[i]);
                }
            }

            return callback(err, result);
        });
    }
    var concatLimit$1 = awaitify(concatLimit, 4);

    /**
     * Applies `iteratee` to each item in `coll`, concatenating the results. Returns
     * the concatenated list. The `iteratee`s are called in parallel, and the
     * results are concatenated as they return. The results array will be returned in
     * the original order of `coll` passed to the `iteratee` function.
     *
     * @name concat
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @alias flatMap
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`,
     * which should use an array as its result. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * let directoryList = ['dir1','dir2','dir3'];
     * let withMissingDirectoryList = ['dir1','dir2','dir3', 'dir4'];
     *
     * // Using callbacks
     * async.concat(directoryList, fs.readdir, function(err, results) {
     *    if (err) {
     *        console.log(err);
     *    } else {
     *        console.log(results);
     *        // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     *    }
     * });
     *
     * // Error Handling
     * async.concat(withMissingDirectoryList, fs.readdir, function(err, results) {
     *    if (err) {
     *        console.log(err);
     *        // [ Error: ENOENT: no such file or directory ]
     *        // since dir4 does not exist
     *    } else {
     *        console.log(results);
     *    }
     * });
     *
     * // Using Promises
     * async.concat(directoryList, fs.readdir)
     * .then(results => {
     *     console.log(results);
     *     // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     * }).catch(err => {
     *      console.log(err);
     * });
     *
     * // Error Handling
     * async.concat(withMissingDirectoryList, fs.readdir)
     * .then(results => {
     *     console.log(results);
     * }).catch(err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4 does not exist
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.concat(directoryList, fs.readdir);
     *         console.log(results);
     *         // [ 'file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', file5.txt ]
     *     } catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let results = await async.concat(withMissingDirectoryList, fs.readdir);
     *         console.log(results);
     *     } catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *         // since dir4 does not exist
     *     }
     * }
     *
     */
    function concat(coll, iteratee, callback) {
        return concatLimit$1(coll, Infinity, iteratee, callback)
    }
    var concat$1 = awaitify(concat, 3);

    /**
     * The same as [`concat`]{@link module:Collections.concat} but runs only a single async operation at a time.
     *
     * @name concatSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.concat]{@link module:Collections.concat}
     * @category Collection
     * @alias flatMapSeries
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each item in `coll`.
     * The iteratee should complete with an array an array of results.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is an array
     * containing the concatenated results of the `iteratee` function. Invoked with
     * (err, results).
     * @returns A Promise, if no callback is passed
     */
    function concatSeries(coll, iteratee, callback) {
        return concatLimit$1(coll, 1, iteratee, callback)
    }
    var concatSeries$1 = awaitify(concatSeries, 3);

    /**
     * Returns a function that when called, calls-back with the values provided.
     * Useful as the first function in a [`waterfall`]{@link module:ControlFlow.waterfall}, or for plugging values in to
     * [`auto`]{@link module:ControlFlow.auto}.
     *
     * @name constant
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {...*} arguments... - Any number of arguments to automatically invoke
     * callback with.
     * @returns {AsyncFunction} Returns a function that when invoked, automatically
     * invokes the callback with the previous given arguments.
     * @example
     *
     * async.waterfall([
     *     async.constant(42),
     *     function (value, next) {
     *         // value === 42
     *     },
     *     //...
     * ], callback);
     *
     * async.waterfall([
     *     async.constant(filename, "utf8"),
     *     fs.readFile,
     *     function (fileData, next) {
     *         //...
     *     }
     *     //...
     * ], callback);
     *
     * async.auto({
     *     hostname: async.constant("https://server.net/"),
     *     port: findFreePort,
     *     launchServer: ["hostname", "port", function (options, cb) {
     *         startServer(options, cb);
     *     }],
     *     //...
     * }, callback);
     */
    function constant(...args) {
        return function (...ignoredArgs/*, callback*/) {
            var callback = ignoredArgs.pop();
            return callback(null, ...args);
        };
    }

    function _createTester(check, getResult) {
        return (eachfn, arr, _iteratee, cb) => {
            var testPassed = false;
            var testResult;
            const iteratee = wrapAsync(_iteratee);
            eachfn(arr, (value, _, callback) => {
                iteratee(value, (err, result) => {
                    if (err || err === false) return callback(err);

                    if (check(result) && !testResult) {
                        testPassed = true;
                        testResult = getResult(true, value);
                        return callback(null, breakLoop);
                    }
                    callback();
                });
            }, err => {
                if (err) return cb(err);
                cb(null, testPassed ? testResult : getResult(false));
            });
        };
    }

    /**
     * Returns the first value in `coll` that passes an async truth test. The
     * `iteratee` is applied in parallel, meaning the first iteratee to return
     * `true` will fire the detect `callback` with that result. That means the
     * result might not be the first item in the original `coll` (in terms of order)
     * that passes the test.

     * If order within the original `coll` is important, then look at
     * [`detectSeries`]{@link module:Collections.detectSeries}.
     *
     * @name detect
     * @static
     * @memberOf module:Collections
     * @method
     * @alias find
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // dir1/file1.txt
     *        // result now equals the first file in the list that exists
     *    }
     *);
     *
     * // Using Promises
     * async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists)
     * .then(result => {
     *     console.log(result);
     *     // dir1/file1.txt
     *     // result now equals the first file in the list that exists
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.detect(['file3.txt','file2.txt','dir1/file1.txt'], fileExists);
     *         console.log(result);
     *         // dir1/file1.txt
     *         // result now equals the file in the list that exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function detect(coll, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOf$1, coll, iteratee, callback)
    }
    var detect$1 = awaitify(detect, 3);

    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name detectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findLimit
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function detectLimit(coll, limit, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var detectLimit$1 = awaitify(detectLimit, 4);

    /**
     * The same as [`detect`]{@link module:Collections.detect} but runs only a single async operation at a time.
     *
     * @name detectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.detect]{@link module:Collections.detect}
     * @alias findSeries
     * @category Collections
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A truth test to apply to each item in `coll`.
     * The iteratee must complete with a boolean value as its result.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the `iteratee` functions have finished.
     * Result will be the first item in the array that passes the truth test
     * (iteratee) or the value `undefined` if none passed. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function detectSeries(coll, iteratee, callback) {
        return _createTester(bool => bool, (res, item) => item)(eachOfLimit(1), coll, iteratee, callback)
    }

    var detectSeries$1 = awaitify(detectSeries, 3);

    function consoleFunc(name) {
        return (fn, ...args) => wrapAsync(fn)(...args, (err, ...resultArgs) => {
            /* istanbul ignore else */
            if (typeof console === 'object') {
                /* istanbul ignore else */
                if (err) {
                    /* istanbul ignore else */
                    if (console.error) {
                        console.error(err);
                    }
                } else if (console[name]) { /* istanbul ignore else */
                    resultArgs.forEach(x => console[name](x));
                }
            }
        })
    }

    /**
     * Logs the result of an [`async` function]{@link AsyncFunction} to the
     * `console` using `console.dir` to display the properties of the resulting object.
     * Only works in Node.js or in browsers that support `console.dir` and
     * `console.error` (such as FF and Chrome).
     * If multiple arguments are returned from the async function,
     * `console.dir` is called on each argument in order.
     *
     * @name dir
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, {hello: name});
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.dir(hello, 'world');
     * {hello: 'world'}
     */
    var dir = consoleFunc('dir');

    /**
     * The post-check version of [`whilst`]{@link module:ControlFlow.whilst}. To reflect the difference in
     * the order of operations, the arguments `test` and `iteratee` are switched.
     *
     * `doWhilst` is to `whilst` as `do while` is to `while` in plain JavaScript.
     *
     * @name doWhilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - A function which is called each time `test`
     * passes. Invoked with (callback).
     * @param {AsyncFunction} test - asynchronous truth test to perform after each
     * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
     * non-error args from the previous callback of `iteratee`.
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped.
     * `callback` will be passed an error and any arguments passed to the final
     * `iteratee`'s callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     */
    function doWhilst(iteratee, test, callback) {
        callback = onlyOnce(callback);
        var _fn = wrapAsync(iteratee);
        var _test = wrapAsync(test);
        var results;

        function next(err, ...args) {
            if (err) return callback(err);
            if (err === false) return;
            results = args;
            _test(...args, check);
        }

        function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
        }

        return check(null, true);
    }

    var doWhilst$1 = awaitify(doWhilst, 3);

    /**
     * Like ['doWhilst']{@link module:ControlFlow.doWhilst}, except the `test` is inverted. Note the
     * argument ordering differs from `until`.
     *
     * @name doUntil
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.doWhilst]{@link module:ControlFlow.doWhilst}
     * @category Control Flow
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {AsyncFunction} test - asynchronous truth test to perform after each
     * execution of `iteratee`. Invoked with (...args, callback), where `...args` are the
     * non-error args from the previous callback of `iteratee`
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     */
    function doUntil(iteratee, test, callback) {
        const _test = wrapAsync(test);
        return doWhilst$1(iteratee, (...args) => {
            const cb = args.pop();
            _test(...args, (err, truth) => cb (err, !truth));
        }, callback);
    }

    function _withoutIndex(iteratee) {
        return (value, index, callback) => iteratee(value, callback);
    }

    /**
     * Applies the function `iteratee` to each item in `coll`, in parallel.
     * The `iteratee` is called with an item from the list, and a callback for when
     * it has finished. If the `iteratee` passes an error to its `callback`, the
     * main `callback` (for the `each` function) is immediately called with the
     * error.
     *
     * Note, that since this function applies `iteratee` to each item in parallel,
     * there is no guarantee that the iteratee functions will complete in order.
     *
     * @name each
     * @static
     * @memberOf module:Collections
     * @method
     * @alias forEach
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to
     * each item in `coll`. Invoked with (item, callback).
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOf`.
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const fileList = [ 'dir1/file2.txt', 'dir2/file3.txt', 'dir/file5.txt'];
     * const withMissingFileList = ['dir1/file1.txt', 'dir4/file2.txt'];
     *
     * // asynchronous function that deletes a file
     * const deleteFile = function(file, callback) {
     *     fs.unlink(file, callback);
     * };
     *
     * // Using callbacks
     * async.each(fileList, deleteFile, function(err) {
     *     if( err ) {
     *         console.log(err);
     *     } else {
     *         console.log('All files have been deleted successfully');
     *     }
     * });
     *
     * // Error Handling
     * async.each(withMissingFileList, deleteFile, function(err){
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4/file2.txt does not exist
     *     // dir1/file1.txt could have been deleted
     * });
     *
     * // Using Promises
     * async.each(fileList, deleteFile)
     * .then( () => {
     *     console.log('All files have been deleted successfully');
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.each(fileList, deleteFile)
     * .then( () => {
     *     console.log('All files have been deleted successfully');
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     *     // since dir4/file2.txt does not exist
     *     // dir1/file1.txt could have been deleted
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         await async.each(files, deleteFile);
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         await async.each(withMissingFileList, deleteFile);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *         // since dir4/file2.txt does not exist
     *         // dir1/file1.txt could have been deleted
     *     }
     * }
     *
     */
    function eachLimit(coll, iteratee, callback) {
        return eachOf$1(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }

    var each = awaitify(eachLimit, 3);

    /**
     * The same as [`each`]{@link module:Collections.each} but runs a maximum of `limit` async operations at a time.
     *
     * @name eachLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfLimit`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachLimit$1(coll, limit, iteratee, callback) {
        return eachOfLimit(limit)(coll, _withoutIndex(wrapAsync(iteratee)), callback);
    }
    var eachLimit$2 = awaitify(eachLimit$1, 4);

    /**
     * The same as [`each`]{@link module:Collections.each} but runs only a single async operation at a time.
     *
     * Note, that unlike [`each`]{@link module:Collections.each}, this function applies iteratee to each item
     * in series and therefore the iteratee functions will complete in order.

     * @name eachSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.each]{@link module:Collections.each}
     * @alias forEachSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each
     * item in `coll`.
     * The array index is not passed to the iteratee.
     * If you need the index, use `eachOfSeries`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called when all
     * `iteratee` functions have finished, or an error occurs. Invoked with (err).
     * @returns {Promise} a promise, if a callback is omitted
     */
    function eachSeries(coll, iteratee, callback) {
        return eachLimit$2(coll, 1, iteratee, callback)
    }
    var eachSeries$1 = awaitify(eachSeries, 3);

    /**
     * Wrap an async function and ensure it calls its callback on a later tick of
     * the event loop.  If the function already calls its callback on a next tick,
     * no extra deferral is added. This is useful for preventing stack overflows
     * (`RangeError: Maximum call stack size exceeded`) and generally keeping
     * [Zalgo](http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony)
     * contained. ES2017 `async` functions are returned as-is -- they are immune
     * to Zalgo's corrupting influences, as they always resolve on a later tick.
     *
     * @name ensureAsync
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - an async function, one that expects a node-style
     * callback as its last argument.
     * @returns {AsyncFunction} Returns a wrapped function with the exact same call
     * signature as the function passed in.
     * @example
     *
     * function sometimesAsync(arg, callback) {
     *     if (cache[arg]) {
     *         return callback(null, cache[arg]); // this would be synchronous!!
     *     } else {
     *         doSomeIO(arg, callback); // this IO would be asynchronous
     *     }
     * }
     *
     * // this has a risk of stack overflows if many results are cached in a row
     * async.mapSeries(args, sometimesAsync, done);
     *
     * // this will defer sometimesAsync's callback if necessary,
     * // preventing stack overflows
     * async.mapSeries(args, async.ensureAsync(sometimesAsync), done);
     */
    function ensureAsync(fn) {
        if (isAsync(fn)) return fn;
        return function (...args/*, callback*/) {
            var callback = args.pop();
            var sync = true;
            args.push((...innerArgs) => {
                if (sync) {
                    setImmediate$1(() => callback(...innerArgs));
                } else {
                    callback(...innerArgs);
                }
            });
            fn.apply(this, args);
            sync = false;
        };
    }

    /**
     * Returns `true` if every element in `coll` satisfies an async test. If any
     * iteratee call returns `false`, the main `callback` is immediately called.
     *
     * @name every
     * @static
     * @memberOf module:Collections
     * @method
     * @alias all
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file5.txt'];
     * const withMissingFileList = ['file1.txt','file2.txt','file4.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.every(fileList, fileExists, function(err, result) {
     *     console.log(result);
     *     // true
     *     // result is true since every file exists
     * });
     *
     * async.every(withMissingFileList, fileExists, function(err, result) {
     *     console.log(result);
     *     // false
     *     // result is false since NOT every file exists
     * });
     *
     * // Using Promises
     * async.every(fileList, fileExists)
     * .then( result => {
     *     console.log(result);
     *     // true
     *     // result is true since every file exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * async.every(withMissingFileList, fileExists)
     * .then( result => {
     *     console.log(result);
     *     // false
     *     // result is false since NOT every file exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.every(fileList, fileExists);
     *         console.log(result);
     *         // true
     *         // result is true since every file exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * async () => {
     *     try {
     *         let result = await async.every(withMissingFileList, fileExists);
     *         console.log(result);
     *         // false
     *         // result is false since NOT every file exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function every(coll, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOf$1, coll, iteratee, callback)
    }
    var every$1 = awaitify(every, 3);

    /**
     * The same as [`every`]{@link module:Collections.every} but runs a maximum of `limit` async operations at a time.
     *
     * @name everyLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in parallel.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function everyLimit(coll, limit, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var everyLimit$1 = awaitify(everyLimit, 4);

    /**
     * The same as [`every`]{@link module:Collections.every} but runs only a single async operation at a time.
     *
     * @name everySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.every]{@link module:Collections.every}
     * @alias allSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collection in series.
     * The iteratee must complete with a boolean result value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result will be either `true` or `false`
     * depending on the values of the async tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function everySeries(coll, iteratee, callback) {
        return _createTester(bool => !bool, res => !res)(eachOfSeries$1, coll, iteratee, callback)
    }
    var everySeries$1 = awaitify(everySeries, 3);

    function filterArray(eachfn, arr, iteratee, callback) {
        var truthValues = new Array(arr.length);
        eachfn(arr, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
                truthValues[index] = !!v;
                iterCb(err);
            });
        }, err => {
            if (err) return callback(err);
            var results = [];
            for (var i = 0; i < arr.length; i++) {
                if (truthValues[i]) results.push(arr[i]);
            }
            callback(null, results);
        });
    }

    function filterGeneric(eachfn, coll, iteratee, callback) {
        var results = [];
        eachfn(coll, (x, index, iterCb) => {
            iteratee(x, (err, v) => {
                if (err) return iterCb(err);
                if (v) {
                    results.push({index, value: x});
                }
                iterCb(err);
            });
        }, err => {
            if (err) return callback(err);
            callback(null, results
                .sort((a, b) => a.index - b.index)
                .map(v => v.value));
        });
    }

    function _filter(eachfn, coll, iteratee, callback) {
        var filter = isArrayLike(coll) ? filterArray : filterGeneric;
        return filter(eachfn, coll, wrapAsync(iteratee), callback);
    }

    /**
     * Returns a new array of all the values in `coll` which pass an async truth
     * test. This operation is performed in parallel, but the results array will be
     * in the same order as the original.
     *
     * @name filter
     * @static
     * @memberOf module:Collections
     * @method
     * @alias select
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * const files = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.filter(files, fileExists, function(err, results) {
     *    if(err) {
     *        console.log(err);
     *    } else {
     *        console.log(results);
     *        // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *        // results is now an array of the existing files
     *    }
     * });
     *
     * // Using Promises
     * async.filter(files, fileExists)
     * .then(results => {
     *     console.log(results);
     *     // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *     // results is now an array of the existing files
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.filter(files, fileExists);
     *         console.log(results);
     *         // [ 'dir1/file1.txt', 'dir2/file3.txt' ]
     *         // results is now an array of the existing files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function filter (coll, iteratee, callback) {
        return _filter(eachOf$1, coll, iteratee, callback)
    }
    var filter$1 = awaitify(filter, 3);

    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name filterLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback provided
     */
    function filterLimit (coll, limit, iteratee, callback) {
        return _filter(eachOfLimit(limit), coll, iteratee, callback)
    }
    var filterLimit$1 = awaitify(filterLimit, 4);

    /**
     * The same as [`filter`]{@link module:Collections.filter} but runs only a single async operation at a time.
     *
     * @name filterSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @alias selectSeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - A truth test to apply to each item in `coll`.
     * The `iteratee` is passed a `callback(err, truthValue)`, which must be called
     * with a boolean argument once it has completed. Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results)
     * @returns {Promise} a promise, if no callback provided
     */
    function filterSeries (coll, iteratee, callback) {
        return _filter(eachOfSeries$1, coll, iteratee, callback)
    }
    var filterSeries$1 = awaitify(filterSeries, 3);

    /**
     * Calls the asynchronous function `fn` with a callback parameter that allows it
     * to call itself again, in series, indefinitely.

     * If an error is passed to the callback then `errback` is called with the
     * error, and execution stops, otherwise it will never be called.
     *
     * @name forever
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} fn - an async function to call repeatedly.
     * Invoked with (next).
     * @param {Function} [errback] - when `fn` passes an error to it's callback,
     * this function will be called, and execution stops. Invoked with (err).
     * @returns {Promise} a promise that rejects if an error occurs and an errback
     * is not passed
     * @example
     *
     * async.forever(
     *     function(next) {
     *         // next is suitable for passing to things that need a callback(err [, whatever]);
     *         // it will result in this function being called again.
     *     },
     *     function(err) {
     *         // if next is called with a value in its first parameter, it will appear
     *         // in here as 'err', and execution will stop.
     *     }
     * );
     */
    function forever(fn, errback) {
        var done = onlyOnce(errback);
        var task = wrapAsync(ensureAsync(fn));

        function next(err) {
            if (err) return done(err);
            if (err === false) return;
            task(next);
        }
        return next();
    }
    var forever$1 = awaitify(forever, 2);

    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs a maximum of `limit` async operations at a time.
     *
     * @name groupByLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     */
    function groupByLimit(coll, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(coll, limit, (val, iterCb) => {
            _iteratee(val, (err, key) => {
                if (err) return iterCb(err);
                return iterCb(err, {key, val});
            });
        }, (err, mapResults) => {
            var result = {};
            // from MDN, handle object having an `hasOwnProperty` prop
            var {hasOwnProperty} = Object.prototype;

            for (var i = 0; i < mapResults.length; i++) {
                if (mapResults[i]) {
                    var {key} = mapResults[i];
                    var {val} = mapResults[i];

                    if (hasOwnProperty.call(result, key)) {
                        result[key].push(val);
                    } else {
                        result[key] = [val];
                    }
                }
            }

            return callback(err, result);
        });
    }

    var groupByLimit$1 = awaitify(groupByLimit, 4);

    /**
     * Returns a new object, where each value corresponds to an array of items, from
     * `coll`, that returned the corresponding key. That is, the keys of the object
     * correspond to the values passed to the `iteratee` callback.
     *
     * Note: Since this function applies the `iteratee` to each item in parallel,
     * there is no guarantee that the `iteratee` functions will complete in order.
     * However, the values for each key in the `result` will be in the same order as
     * the original `coll`. For Objects, the values will roughly be in the order of
     * the original Objects' keys (but this can vary across JavaScript engines).
     *
     * @name groupBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whoses
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * const files = ['dir1/file1.txt','dir2','dir4']
     *
     * // asynchronous function that detects file type as none, file, or directory
     * function detectFile(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(null, 'none');
     *         }
     *         callback(null, stat.isDirectory() ? 'directory' : 'file');
     *     });
     * }
     *
     * //Using callbacks
     * async.groupBy(files, detectFile, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *	       console.log(result);
     *         // {
     *         //     file: [ 'dir1/file1.txt' ],
     *         //     none: [ 'dir4' ],
     *         //     directory: [ 'dir2']
     *         // }
     *         // result is object containing the files grouped by type
     *     }
     * });
     *
     * // Using Promises
     * async.groupBy(files, detectFile)
     * .then( result => {
     *     console.log(result);
     *     // {
     *     //     file: [ 'dir1/file1.txt' ],
     *     //     none: [ 'dir4' ],
     *     //     directory: [ 'dir2']
     *     // }
     *     // result is object containing the files grouped by type
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.groupBy(files, detectFile);
     *         console.log(result);
     *         // {
     *         //     file: [ 'dir1/file1.txt' ],
     *         //     none: [ 'dir4' ],
     *         //     directory: [ 'dir2']
     *         // }
     *         // result is object containing the files grouped by type
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function groupBy (coll, iteratee, callback) {
        return groupByLimit$1(coll, Infinity, iteratee, callback)
    }

    /**
     * The same as [`groupBy`]{@link module:Collections.groupBy} but runs only a single async operation at a time.
     *
     * @name groupBySeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.groupBy]{@link module:Collections.groupBy}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a `key` to group the value under.
     * Invoked with (value, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. Result is an `Object` whose
     * properties are arrays of values which returned the corresponding key.
     * @returns {Promise} a promise, if no callback is passed
     */
    function groupBySeries (coll, iteratee, callback) {
        return groupByLimit$1(coll, 1, iteratee, callback)
    }

    /**
     * Logs the result of an `async` function to the `console`. Only works in
     * Node.js or in browsers that support `console.log` and `console.error` (such
     * as FF and Chrome). If multiple arguments are returned from the async
     * function, `console.log` is called on each argument in order.
     *
     * @name log
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} function - The function you want to eventually apply
     * all arguments to.
     * @param {...*} arguments... - Any number of arguments to apply to the function.
     * @example
     *
     * // in a module
     * var hello = function(name, callback) {
     *     setTimeout(function() {
     *         callback(null, 'hello ' + name);
     *     }, 1000);
     * };
     *
     * // in the node repl
     * node> async.log(hello, 'world');
     * 'hello world'
     */
    var log = consoleFunc('log');

    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name mapValuesLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapValuesLimit(obj, limit, iteratee, callback) {
        callback = once(callback);
        var newObj = {};
        var _iteratee = wrapAsync(iteratee);
        return eachOfLimit(limit)(obj, (val, key, next) => {
            _iteratee(val, key, (err, result) => {
                if (err) return next(err);
                newObj[key] = result;
                next(err);
            });
        }, err => callback(err, newObj));
    }

    var mapValuesLimit$1 = awaitify(mapValuesLimit, 4);

    /**
     * A relative of [`map`]{@link module:Collections.map}, designed for use with objects.
     *
     * Produces a new Object by mapping each value of `obj` through the `iteratee`
     * function. The `iteratee` is called each `value` and `key` from `obj` and a
     * callback for when it has finished processing. Each of these callbacks takes
     * two arguments: an `error`, and the transformed item from `obj`. If `iteratee`
     * passes an error to its callback, the main `callback` (for the `mapValues`
     * function) is immediately called with the error.
     *
     * Note, the order of the keys in the result is not guaranteed.  The keys will
     * be roughly in the order they complete, (but this is very engine-specific)
     *
     * @name mapValues
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     * // file4.txt does not exist
     *
     * const fileMap = {
     *     f1: 'file1.txt',
     *     f2: 'file2.txt',
     *     f3: 'file3.txt'
     * };
     *
     * const withMissingFileMap = {
     *     f1: 'file1.txt',
     *     f2: 'file2.txt',
     *     f3: 'file4.txt'
     * };
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, key, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.mapValues(fileMap, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // result is now a map of file size in bytes for each file, e.g.
     *         // {
     *         //     f1: 1000,
     *         //     f2: 2000,
     *         //     f3: 3000
     *         // }
     *     }
     * });
     *
     * // Error handling
     * async.mapValues(withMissingFileMap, getFileSizeInBytes, function(err, result) {
     *     if (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     } else {
     *         console.log(result);
     *     }
     * });
     *
     * // Using Promises
     * async.mapValues(fileMap, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     *     // result is now a map of file size in bytes for each file, e.g.
     *     // {
     *     //     f1: 1000,
     *     //     f2: 2000,
     *     //     f3: 3000
     *     // }
     * }).catch (err => {
     *     console.log(err);
     * });
     *
     * // Error Handling
     * async.mapValues(withMissingFileMap, getFileSizeInBytes)
     * .then( result => {
     *     console.log(result);
     * }).catch (err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.mapValues(fileMap, getFileSizeInBytes);
     *         console.log(result);
     *         // result is now a map of file size in bytes for each file, e.g.
     *         // {
     *         //     f1: 1000,
     *         //     f2: 2000,
     *         //     f3: 3000
     *         // }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // Error Handling
     * async () => {
     *     try {
     *         let result = await async.mapValues(withMissingFileMap, getFileSizeInBytes);
     *         console.log(result);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function mapValues(obj, iteratee, callback) {
        return mapValuesLimit$1(obj, Infinity, iteratee, callback)
    }

    /**
     * The same as [`mapValues`]{@link module:Collections.mapValues} but runs only a single async operation at a time.
     *
     * @name mapValuesSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.mapValues]{@link module:Collections.mapValues}
     * @category Collection
     * @param {Object} obj - A collection to iterate over.
     * @param {AsyncFunction} iteratee - A function to apply to each value and key
     * in `coll`.
     * The iteratee should complete with the transformed value as its result.
     * Invoked with (value, key, callback).
     * @param {Function} [callback] - A callback which is called when all `iteratee`
     * functions have finished, or an error occurs. `result` is a new object consisting
     * of each key from `obj`, with each transformed value on the right-hand side.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function mapValuesSeries(obj, iteratee, callback) {
        return mapValuesLimit$1(obj, 1, iteratee, callback)
    }

    /**
     * Caches the results of an async function. When creating a hash to store
     * function results against, the callback is omitted from the hash and an
     * optional hash function can be used.
     *
     * **Note: if the async function errs, the result will not be cached and
     * subsequent calls will call the wrapped function.**
     *
     * If no hash function is specified, the first argument is used as a hash key,
     * which may work reasonably if it is a string or a data type that converts to a
     * distinct string. Note that objects and arrays will not behave reasonably.
     * Neither will cases where the other arguments are significant. In such cases,
     * specify your own hash function.
     *
     * The cache of results is exposed as the `memo` property of the function
     * returned by `memoize`.
     *
     * @name memoize
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function to proxy and cache results from.
     * @param {Function} hasher - An optional function for generating a custom hash
     * for storing results. It has all the arguments applied to it apart from the
     * callback, and must be synchronous.
     * @returns {AsyncFunction} a memoized version of `fn`
     * @example
     *
     * var slow_fn = function(name, callback) {
     *     // do something
     *     callback(null, result);
     * };
     * var fn = async.memoize(slow_fn);
     *
     * // fn can now be used as if it were slow_fn
     * fn('some name', function() {
     *     // callback
     * });
     */
    function memoize(fn, hasher = v => v) {
        var memo = Object.create(null);
        var queues = Object.create(null);
        var _fn = wrapAsync(fn);
        var memoized = initialParams((args, callback) => {
            var key = hasher(...args);
            if (key in memo) {
                setImmediate$1(() => callback(null, ...memo[key]));
            } else if (key in queues) {
                queues[key].push(callback);
            } else {
                queues[key] = [callback];
                _fn(...args, (err, ...resultArgs) => {
                    // #1465 don't memoize if an error occurred
                    if (!err) {
                        memo[key] = resultArgs;
                    }
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i](err, ...resultArgs);
                    }
                });
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    }

    /* istanbul ignore file */

    /**
     * Calls `callback` on a later loop around the event loop. In Node.js this just
     * calls `process.nextTick`.  In the browser it will use `setImmediate` if
     * available, otherwise `setTimeout(callback, 0)`, which means other higher
     * priority events may precede the execution of `callback`.
     *
     * This is used internally for browser-compatibility purposes.
     *
     * @name nextTick
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.setImmediate]{@link module:Utils.setImmediate}
     * @category Util
     * @param {Function} callback - The function to call on a later loop around
     * the event loop. Invoked with (args...).
     * @param {...*} args... - any number of additional arguments to pass to the
     * callback on the next tick.
     * @example
     *
     * var call_order = [];
     * async.nextTick(function() {
     *     call_order.push('two');
     *     // call_order now equals ['one','two']
     * });
     * call_order.push('one');
     *
     * async.setImmediate(function (a, b, c) {
     *     // a, b, and c equal 1, 2, and 3
     * }, 1, 2, 3);
     */
    var _defer$1;

    if (hasNextTick) {
        _defer$1 = process.nextTick;
    } else if (hasSetImmediate) {
        _defer$1 = setImmediate;
    } else {
        _defer$1 = fallback;
    }

    var nextTick = wrap(_defer$1);

    var parallel = awaitify((eachfn, tasks, callback) => {
        var results = isArrayLike(tasks) ? [] : {};

        eachfn(tasks, (task, key, taskCb) => {
            wrapAsync(task)((err, ...result) => {
                if (result.length < 2) {
                    [result] = result;
                }
                results[key] = result;
                taskCb(err);
            });
        }, err => callback(err, results));
    }, 3);

    /**
     * Run the `tasks` collection of functions in parallel, without waiting until
     * the previous function has completed. If any of the functions pass an error to
     * its callback, the main `callback` is immediately called with the value of the
     * error. Once the `tasks` have completed, the results are passed to the final
     * `callback` as an array.
     *
     * **Note:** `parallel` is about kicking-off I/O tasks in parallel, not about
     * parallel execution of code.  If your tasks do not use any timers or perform
     * any I/O, they will actually be executed in series.  Any synchronous setup
     * sections for each task will happen one after the other.  JavaScript remains
     * single-threaded.
     *
     * **Hint:** Use [`reflect`]{@link module:Utils.reflect} to continue the
     * execution of other tasks when a task fails.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     * results from {@link async.parallel}.
     *
     * @name parallel
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     *
     * @example
     *
     * //Using Callbacks
     * async.parallel([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ], function(err, results) {
     *     console.log(results);
     *     // results is equal to ['one','two'] even though
     *     // the second function had a shorter timeout.
     * });
     *
     * // an example using an object instead of an array
     * async.parallel({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * });
     *
     * //Using Promises
     * async.parallel([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ]).then(results => {
     *     console.log(results);
     *     // results is equal to ['one','two'] even though
     *     // the second function had a shorter timeout.
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // an example using an object instead of an array
     * async.parallel({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }).then(results => {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.parallel([
     *             function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 'one');
     *                 }, 200);
     *             },
     *             function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 'two');
     *                 }, 100);
     *             }
     *         ]);
     *         console.log(results);
     *         // results is equal to ['one','two'] even though
     *         // the second function had a shorter timeout.
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // an example using an object instead of an array
     * async () => {
     *     try {
     *         let results = await async.parallel({
     *             one: function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 1);
     *                 }, 200);
     *             },
     *            two: function(callback) {
     *                 setTimeout(function() {
     *                     callback(null, 2);
     *                 }, 100);
     *            }
     *         });
     *         console.log(results);
     *         // results is equal to: { one: 1, two: 2 }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function parallel$1(tasks, callback) {
        return parallel(eachOf$1, tasks, callback);
    }

    /**
     * The same as [`parallel`]{@link module:ControlFlow.parallel} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name parallelLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.parallel]{@link module:ControlFlow.parallel}
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection of
     * [async functions]{@link AsyncFunction} to run.
     * Each async function can complete with any number of optional `result` values.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed successfully. This function gets a results array
     * (or object) containing all the result arguments passed to the task callbacks.
     * Invoked with (err, results).
     * @returns {Promise} a promise, if a callback is not passed
     */
    function parallelLimit(tasks, limit, callback) {
        return parallel(eachOfLimit(limit), tasks, callback);
    }

    /**
     * A queue of tasks for the worker function to complete.
     * @typedef {Iterable} QueueObject
     * @memberOf module:ControlFlow
     * @property {Function} length - a function returning the number of items
     * waiting to be processed. Invoke with `queue.length()`.
     * @property {boolean} started - a boolean indicating whether or not any
     * items have been pushed and processed by the queue.
     * @property {Function} running - a function returning the number of items
     * currently being processed. Invoke with `queue.running()`.
     * @property {Function} workersList - a function returning the array of items
     * currently being processed. Invoke with `queue.workersList()`.
     * @property {Function} idle - a function returning false if there are items
     * waiting or being processed, or true if not. Invoke with `queue.idle()`.
     * @property {number} concurrency - an integer for determining how many `worker`
     * functions should be run in parallel. This property can be changed after a
     * `queue` is created to alter the concurrency on-the-fly.
     * @property {number} payload - an integer that specifies how many items are
     * passed to the worker function at a time. only applies if this is a
     * [cargo]{@link module:ControlFlow.cargo} object
     * @property {AsyncFunction} push - add a new task to the `queue`. Calls `callback`
     * once the `worker` has finished processing the task. Instead of a single task,
     * a `tasks` array can be submitted. The respective callback is used for every
     * task in the list. Invoke with `queue.push(task, [callback])`,
     * @property {AsyncFunction} unshift - add a new task to the front of the `queue`.
     * Invoke with `queue.unshift(task, [callback])`.
     * @property {AsyncFunction} pushAsync - the same as `q.push`, except this returns
     * a promise that rejects if an error occurs.
     * @property {AsyncFunction} unshiftAsync - the same as `q.unshift`, except this returns
     * a promise that rejects if an error occurs.
     * @property {Function} remove - remove items from the queue that match a test
     * function.  The test function will be passed an object with a `data` property,
     * and a `priority` property, if this is a
     * [priorityQueue]{@link module:ControlFlow.priorityQueue} object.
     * Invoked with `queue.remove(testFn)`, where `testFn` is of the form
     * `function ({data, priority}) {}` and returns a Boolean.
     * @property {Function} saturated - a function that sets a callback that is
     * called when the number of running workers hits the `concurrency` limit, and
     * further tasks will be queued.  If the callback is omitted, `q.saturated()`
     * returns a promise for the next occurrence.
     * @property {Function} unsaturated - a function that sets a callback that is
     * called when the number of running workers is less than the `concurrency` &
     * `buffer` limits, and further tasks will not be queued. If the callback is
     * omitted, `q.unsaturated()` returns a promise for the next occurrence.
     * @property {number} buffer - A minimum threshold buffer in order to say that
     * the `queue` is `unsaturated`.
     * @property {Function} empty - a function that sets a callback that is called
     * when the last item from the `queue` is given to a `worker`. If the callback
     * is omitted, `q.empty()` returns a promise for the next occurrence.
     * @property {Function} drain - a function that sets a callback that is called
     * when the last item from the `queue` has returned from the `worker`. If the
     * callback is omitted, `q.drain()` returns a promise for the next occurrence.
     * @property {Function} error - a function that sets a callback that is called
     * when a task errors. Has the signature `function(error, task)`. If the
     * callback is omitted, `error()` returns a promise that rejects on the next
     * error.
     * @property {boolean} paused - a boolean for determining whether the queue is
     * in a paused state.
     * @property {Function} pause - a function that pauses the processing of tasks
     * until `resume()` is called. Invoke with `queue.pause()`.
     * @property {Function} resume - a function that resumes the processing of
     * queued tasks when the queue is paused. Invoke with `queue.resume()`.
     * @property {Function} kill - a function that removes the `drain` callback and
     * empties remaining tasks from the queue forcing it to go idle. No more tasks
     * should be pushed to the queue after calling this function. Invoke with `queue.kill()`.
     *
     * @example
     * const q = async.queue(worker, 2)
     * q.push(item1)
     * q.push(item2)
     * q.push(item3)
     * // queues are iterable, spread into an array to inspect
     * const items = [...q] // [item1, item2, item3]
     * // or use for of
     * for (let item of q) {
     *     console.log(item)
     * }
     *
     * q.drain(() => {
     *     console.log('all done')
     * })
     * // or
     * await q.drain()
     */

    /**
     * Creates a `queue` object with the specified `concurrency`. Tasks added to the
     * `queue` are processed in parallel (up to the `concurrency` limit). If all
     * `worker`s are in progress, the task is queued until one becomes available.
     * Once a `worker` completes a `task`, that `task`'s callback is called.
     *
     * @name queue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`. Invoked with (task, callback).
     * @param {number} [concurrency=1] - An `integer` for determining how many
     * `worker` functions should be run in parallel.  If omitted, the concurrency
     * defaults to `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A queue object to manage the tasks. Callbacks can be
     * attached as certain properties to listen for specific events during the
     * lifecycle of the queue.
     * @example
     *
     * // create a queue object with concurrency 2
     * var q = async.queue(function(task, callback) {
     *     console.log('hello ' + task.name);
     *     callback();
     * }, 2);
     *
     * // assign a callback
     * q.drain(function() {
     *     console.log('all items have been processed');
     * });
     * // or await the end
     * await q.drain()
     *
     * // assign an error callback
     * q.error(function(err, task) {
     *     console.error('task experienced an error');
     * });
     *
     * // add some items to the queue
     * q.push({name: 'foo'}, function(err) {
     *     console.log('finished processing foo');
     * });
     * // callback is optional
     * q.push({name: 'bar'});
     *
     * // add some items to the queue (batch-wise)
     * q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
     *     console.log('finished processing item');
     * });
     *
     * // add some items to the front of the queue
     * q.unshift({name: 'bar'}, function (err) {
     *     console.log('finished processing bar');
     * });
     */
    function queue$1 (worker, concurrency) {
        var _worker = wrapAsync(worker);
        return queue((items, cb) => {
            _worker(items[0], cb);
        }, concurrency, 1);
    }

    // Binary min-heap implementation used for priority queue.
    // Implementation is stable, i.e. push time is considered for equal priorities
    class Heap {
        constructor() {
            this.heap = [];
            this.pushCount = Number.MIN_SAFE_INTEGER;
        }

        get length() {
            return this.heap.length;
        }

        empty () {
            this.heap = [];
            return this;
        }

        percUp(index) {
            let p;

            while (index > 0 && smaller(this.heap[index], this.heap[p=parent(index)])) {
                let t = this.heap[index];
                this.heap[index] = this.heap[p];
                this.heap[p] = t;

                index = p;
            }
        }

        percDown(index) {
            let l;

            while ((l=leftChi(index)) < this.heap.length) {
                if (l+1 < this.heap.length && smaller(this.heap[l+1], this.heap[l])) {
                    l = l+1;
                }

                if (smaller(this.heap[index], this.heap[l])) {
                    break;
                }

                let t = this.heap[index];
                this.heap[index] = this.heap[l];
                this.heap[l] = t;

                index = l;
            }
        }

        push(node) {
            node.pushCount = ++this.pushCount;
            this.heap.push(node);
            this.percUp(this.heap.length-1);
        }

        unshift(node) {
            return this.heap.push(node);
        }

        shift() {
            let [top] = this.heap;

            this.heap[0] = this.heap[this.heap.length-1];
            this.heap.pop();
            this.percDown(0);

            return top;
        }

        toArray() {
            return [...this];
        }

        *[Symbol.iterator] () {
            for (let i = 0; i < this.heap.length; i++) {
                yield this.heap[i].data;
            }
        }

        remove (testFn) {
            let j = 0;
            for (let i = 0; i < this.heap.length; i++) {
                if (!testFn(this.heap[i])) {
                    this.heap[j] = this.heap[i];
                    j++;
                }
            }

            this.heap.splice(j);

            for (let i = parent(this.heap.length-1); i >= 0; i--) {
                this.percDown(i);
            }

            return this;
        }
    }

    function leftChi(i) {
        return (i<<1)+1;
    }

    function parent(i) {
        return ((i+1)>>1)-1;
    }

    function smaller(x, y) {
        if (x.priority !== y.priority) {
            return x.priority < y.priority;
        }
        else {
            return x.pushCount < y.pushCount;
        }
    }

    /**
     * The same as [async.queue]{@link module:ControlFlow.queue} only tasks are assigned a priority and
     * completed in ascending priority order.
     *
     * @name priorityQueue
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.queue]{@link module:ControlFlow.queue}
     * @category Control Flow
     * @param {AsyncFunction} worker - An async function for processing a queued task.
     * If you want to handle errors from an individual task, pass a callback to
     * `q.push()`.
     * Invoked with (task, callback).
     * @param {number} concurrency - An `integer` for determining how many `worker`
     * functions should be run in parallel.  If omitted, the concurrency defaults to
     * `1`.  If the concurrency is `0`, an error is thrown.
     * @returns {module:ControlFlow.QueueObject} A priorityQueue object to manage the tasks. There are three
     * differences between `queue` and `priorityQueue` objects:
     * * `push(task, priority, [callback])` - `priority` should be a number. If an
     *   array of `tasks` is given, all tasks will be assigned the same priority.
     * * `pushAsync(task, priority, [callback])` - the same as `priorityQueue.push`,
     *   except this returns a promise that rejects if an error occurs.
     * * The `unshift` and `unshiftAsync` methods were removed.
     */
    function priorityQueue(worker, concurrency) {
        // Start with a normal queue
        var q = queue$1(worker, concurrency);

        var {
            push,
            pushAsync
        } = q;

        q._tasks = new Heap();
        q._createTaskItem = ({data, priority}, callback) => {
            return {
                data,
                priority,
                callback
            };
        };

        function createDataItems(tasks, priority) {
            if (!Array.isArray(tasks)) {
                return {data: tasks, priority};
            }
            return tasks.map(data => { return {data, priority}; });
        }

        // Override push to accept second parameter representing priority
        q.push = function(data, priority = 0, callback) {
            return push(createDataItems(data, priority), callback);
        };

        q.pushAsync = function(data, priority = 0, callback) {
            return pushAsync(createDataItems(data, priority), callback);
        };

        // Remove unshift functions
        delete q.unshift;
        delete q.unshiftAsync;

        return q;
    }

    /**
     * Runs the `tasks` array of functions in parallel, without waiting until the
     * previous function has completed. Once any of the `tasks` complete or pass an
     * error to its callback, the main `callback` is immediately called. It's
     * equivalent to `Promise.race()`.
     *
     * @name race
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array containing [async functions]{@link AsyncFunction}
     * to run. Each function can complete with an optional `result` value.
     * @param {Function} callback - A callback to run once any of the functions have
     * completed. This function gets an error or result from the first function that
     * completed. Invoked with (err, result).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * async.race([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ],
     * // main callback
     * function(err, result) {
     *     // the result will be equal to 'two' as it finishes earlier
     * });
     */
    function race(tasks, callback) {
        callback = once(callback);
        if (!Array.isArray(tasks)) return callback(new TypeError('First argument to race must be an array of functions'));
        if (!tasks.length) return callback();
        for (var i = 0, l = tasks.length; i < l; i++) {
            wrapAsync(tasks[i])(callback);
        }
    }

    var race$1 = awaitify(race, 2);

    /**
     * Same as [`reduce`]{@link module:Collections.reduce}, only operates on `array` in reverse order.
     *
     * @name reduceRight
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reduce]{@link module:Collections.reduce}
     * @alias foldr
     * @category Collection
     * @param {Array} array - A collection to iterate over.
     * @param {*} memo - The initial state of the reduction.
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * array to produce the next step in the reduction.
     * The `iteratee` should complete with the next state of the reduction.
     * If the iteratee completes with an error, the reduction is stopped and the
     * main `callback` is immediately called with the error.
     * Invoked with (memo, item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the reduced value. Invoked with
     * (err, result).
     * @returns {Promise} a promise, if no callback is passed
     */
    function reduceRight (array, memo, iteratee, callback) {
        var reversed = [...array].reverse();
        return reduce$1(reversed, memo, iteratee, callback);
    }

    /**
     * Wraps the async function in another function that always completes with a
     * result object, even when it errors.
     *
     * The result object has either the property `error` or `value`.
     *
     * @name reflect
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} fn - The async function you want to wrap
     * @returns {Function} - A function that always passes null to it's callback as
     * the error. The second argument to the callback will be an `object` with
     * either an `error` or a `value` property.
     * @example
     *
     * async.parallel([
     *     async.reflect(function(callback) {
     *         // do some stuff ...
     *         callback(null, 'one');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff but error ...
     *         callback('bad stuff happened');
     *     }),
     *     async.reflect(function(callback) {
     *         // do some more stuff ...
     *         callback(null, 'two');
     *     })
     * ],
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = 'bad stuff happened'
     *     // results[2].value = 'two'
     * });
     */
    function reflect(fn) {
        var _fn = wrapAsync(fn);
        return initialParams(function reflectOn(args, reflectCallback) {
            args.push((error, ...cbArgs) => {
                let retVal = {};
                if (error) {
                    retVal.error = error;
                }
                if (cbArgs.length > 0){
                    var value = cbArgs;
                    if (cbArgs.length <= 1) {
                        [value] = cbArgs;
                    }
                    retVal.value = value;
                }
                reflectCallback(null, retVal);
            });

            return _fn.apply(this, args);
        });
    }

    /**
     * A helper function that wraps an array or an object of functions with `reflect`.
     *
     * @name reflectAll
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.reflect]{@link module:Utils.reflect}
     * @category Util
     * @param {Array|Object|Iterable} tasks - The collection of
     * [async functions]{@link AsyncFunction} to wrap in `async.reflect`.
     * @returns {Array} Returns an array of async functions, each wrapped in
     * `async.reflect`
     * @example
     *
     * let tasks = [
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         // do some more stuff but error ...
     *         callback(new Error('bad stuff happened'));
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ];
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results[0].value = 'one'
     *     // results[1].error = Error('bad stuff happened')
     *     // results[2].value = 'two'
     * });
     *
     * // an example using an object instead of an array
     * let tasks = {
     *     one: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         callback('two');
     *     },
     *     three: function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'three');
     *         }, 100);
     *     }
     * };
     *
     * async.parallel(async.reflectAll(tasks),
     * // optional callback
     * function(err, results) {
     *     // values
     *     // results.one.value = 'one'
     *     // results.two.error = 'two'
     *     // results.three.value = 'three'
     * });
     */
    function reflectAll(tasks) {
        var results;
        if (Array.isArray(tasks)) {
            results = tasks.map(reflect);
        } else {
            results = {};
            Object.keys(tasks).forEach(key => {
                results[key] = reflect.call(this, tasks[key]);
            });
        }
        return results;
    }

    function reject(eachfn, arr, _iteratee, callback) {
        const iteratee = wrapAsync(_iteratee);
        return _filter(eachfn, arr, (value, cb) => {
            iteratee(value, (err, v) => {
                cb(err, !v);
            });
        }, callback);
    }

    /**
     * The opposite of [`filter`]{@link module:Collections.filter}. Removes values that pass an `async` truth test.
     *
     * @name reject
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.filter]{@link module:Collections.filter}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     *
     * const fileList = ['dir1/file1.txt','dir2/file3.txt','dir3/file6.txt'];
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.reject(fileList, fileExists, function(err, results) {
     *    // [ 'dir3/file6.txt' ]
     *    // results now equals an array of the non-existing files
     * });
     *
     * // Using Promises
     * async.reject(fileList, fileExists)
     * .then( results => {
     *     console.log(results);
     *     // [ 'dir3/file6.txt' ]
     *     // results now equals an array of the non-existing files
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let results = await async.reject(fileList, fileExists);
     *         console.log(results);
     *         // [ 'dir3/file6.txt' ]
     *         // results now equals an array of the non-existing files
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function reject$1 (coll, iteratee, callback) {
        return reject(eachOf$1, coll, iteratee, callback)
    }
    var reject$2 = awaitify(reject$1, 3);

    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name rejectLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function rejectLimit (coll, limit, iteratee, callback) {
        return reject(eachOfLimit(limit), coll, iteratee, callback)
    }
    var rejectLimit$1 = awaitify(rejectLimit, 4);

    /**
     * The same as [`reject`]{@link module:Collections.reject} but runs only a single async operation at a time.
     *
     * @name rejectSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.reject]{@link module:Collections.reject}
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {Function} iteratee - An async truth test to apply to each item in
     * `coll`.
     * The should complete with a boolean value as its `result`.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback is passed
     */
    function rejectSeries (coll, iteratee, callback) {
        return reject(eachOfSeries$1, coll, iteratee, callback)
    }
    var rejectSeries$1 = awaitify(rejectSeries, 3);

    function constant$1(value) {
        return function () {
            return value;
        }
    }

    /**
     * Attempts to get a successful response from `task` no more than `times` times
     * before returning an error. If the task is successful, the `callback` will be
     * passed the result of the successful task. If all attempts fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name retry
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @see [async.retryable]{@link module:ControlFlow.retryable}
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - Can be either an
     * object with `times` and `interval` or a number.
     * * `times` - The number of attempts to make before giving up.  The default
     *   is `5`.
     * * `interval` - The time to wait between retries, in milliseconds.  The
     *   default is `0`. The interval may also be specified as a function of the
     *   retry count (see example).
     * * `errorFilter` - An optional synchronous function that is invoked on
     *   erroneous result. If it returns `true` the retry attempts will continue;
     *   if the function returns `false` the retry flow is aborted with the current
     *   attempt's error and result being returned to the final callback.
     *   Invoked with (err).
     * * If `opts` is a number, the number specifies the number of times to retry,
     *   with the default interval of `0`.
     * @param {AsyncFunction} task - An async function to retry.
     * Invoked with (callback).
     * @param {Function} [callback] - An optional callback which is called when the
     * task has succeeded, or after the final failed attempt. It receives the `err`
     * and `result` arguments of the last attempt at completing the `task`. Invoked
     * with (err, results).
     * @returns {Promise} a promise if no callback provided
     *
     * @example
     *
     * // The `retry` function can be used as a stand-alone control flow by passing
     * // a callback, as shown below:
     *
     * // try calling apiMethod 3 times
     * async.retry(3, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 3 times, waiting 200 ms between each retry
     * async.retry({times: 3, interval: 200}, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod 10 times with exponential backoff
     * // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
     * async.retry({
     *   times: 10,
     *   interval: function(retryCount) {
     *     return 50 * Math.pow(2, retryCount);
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod the default 5 times no delay between each retry
     * async.retry(apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // try calling apiMethod only when error condition satisfies, all other
     * // errors will abort the retry control flow and return to final callback
     * async.retry({
     *   errorFilter: function(err) {
     *     return err.message === 'Temporary error'; // only retry on a specific error
     *   }
     * }, apiMethod, function(err, result) {
     *     // do something with the result
     * });
     *
     * // to retry individual methods that are not as reliable within other
     * // control flow functions, use the `retryable` wrapper:
     * async.auto({
     *     users: api.getUsers.bind(api),
     *     payments: async.retryable(3, api.getPayments.bind(api))
     * }, function(err, results) {
     *     // do something with the results
     * });
     *
     */
    const DEFAULT_TIMES = 5;
    const DEFAULT_INTERVAL = 0;

    function retry(opts, task, callback) {
        var options = {
            times: DEFAULT_TIMES,
            intervalFunc: constant$1(DEFAULT_INTERVAL)
        };

        if (arguments.length < 3 && typeof opts === 'function') {
            callback = task || promiseCallback();
            task = opts;
        } else {
            parseTimes(options, opts);
            callback = callback || promiseCallback();
        }

        if (typeof task !== 'function') {
            throw new Error("Invalid arguments for async.retry");
        }

        var _task = wrapAsync(task);

        var attempt = 1;
        function retryAttempt() {
            _task((err, ...args) => {
                if (err === false) return
                if (err && attempt++ < options.times &&
                    (typeof options.errorFilter != 'function' ||
                        options.errorFilter(err))) {
                    setTimeout(retryAttempt, options.intervalFunc(attempt - 1));
                } else {
                    callback(err, ...args);
                }
            });
        }

        retryAttempt();
        return callback[PROMISE_SYMBOL]
    }

    function parseTimes(acc, t) {
        if (typeof t === 'object') {
            acc.times = +t.times || DEFAULT_TIMES;

            acc.intervalFunc = typeof t.interval === 'function' ?
                t.interval :
                constant$1(+t.interval || DEFAULT_INTERVAL);

            acc.errorFilter = t.errorFilter;
        } else if (typeof t === 'number' || typeof t === 'string') {
            acc.times = +t || DEFAULT_TIMES;
        } else {
            throw new Error("Invalid arguments for async.retry");
        }
    }

    /**
     * A close relative of [`retry`]{@link module:ControlFlow.retry}.  This method
     * wraps a task and makes it retryable, rather than immediately calling it
     * with retries.
     *
     * @name retryable
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.retry]{@link module:ControlFlow.retry}
     * @category Control Flow
     * @param {Object|number} [opts = {times: 5, interval: 0}| 5] - optional
     * options, exactly the same as from `retry`, except for a `opts.arity` that
     * is the arity of the `task` function, defaulting to `task.length`
     * @param {AsyncFunction} task - the asynchronous function to wrap.
     * This function will be passed any arguments passed to the returned wrapper.
     * Invoked with (...args, callback).
     * @returns {AsyncFunction} The wrapped function, which when invoked, will
     * retry on an error, based on the parameters specified in `opts`.
     * This function will accept the same parameters as `task`.
     * @example
     *
     * async.auto({
     *     dep1: async.retryable(3, getFromFlakyService),
     *     process: ["dep1", async.retryable(3, function (results, cb) {
     *         maybeProcessData(results.dep1, cb);
     *     })]
     * }, callback);
     */
    function retryable (opts, task) {
        if (!task) {
            task = opts;
            opts = null;
        }
        let arity = (opts && opts.arity) || task.length;
        if (isAsync(task)) {
            arity += 1;
        }
        var _task = wrapAsync(task);
        return initialParams((args, callback) => {
            if (args.length < arity - 1 || callback == null) {
                args.push(callback);
                callback = promiseCallback();
            }
            function taskFn(cb) {
                _task(...args, cb);
            }

            if (opts) retry(opts, taskFn, callback);
            else retry(taskFn, callback);

            return callback[PROMISE_SYMBOL]
        });
    }

    /**
     * Run the functions in the `tasks` collection in series, each one running once
     * the previous function has completed. If any functions in the series pass an
     * error to its callback, no more functions are run, and `callback` is
     * immediately called with the value of the error. Otherwise, `callback`
     * receives an array of results when `tasks` have completed.
     *
     * It is also possible to use an object instead of an array. Each property will
     * be run as a function, and the results will be passed to the final `callback`
     * as an object instead of an array. This can be a more readable way of handling
     *  results from {@link async.series}.
     *
     * **Note** that while many implementations preserve the order of object
     * properties, the [ECMAScript Language Specification](http://www.ecma-international.org/ecma-262/5.1/#sec-8.6)
     * explicitly states that
     *
     * > The mechanics and order of enumerating the properties is not specified.
     *
     * So if you rely on the order in which your series of functions are executed,
     * and want this to work on all platforms, consider using an array.
     *
     * @name series
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing
     * [async functions]{@link AsyncFunction} to run in series.
     * Each function can complete with any number of optional `result` values.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This function gets a results array (or object)
     * containing all the result arguments passed to the `task` callbacks. Invoked
     * with (err, result).
     * @return {Promise} a promise, if no callback is passed
     * @example
     *
     * //Using Callbacks
     * async.series([
     *     function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ], function(err, results) {
     *     console.log(results);
     *     // results is equal to ['one','two']
     * });
     *
     * // an example using objects instead of arrays
     * async.series({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }, function(err, results) {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * });
     *
     * //Using Promises
     * async.series([
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'one');
     *         }, 200);
     *     },
     *     function(callback) {
     *         setTimeout(function() {
     *             callback(null, 'two');
     *         }, 100);
     *     }
     * ]).then(results => {
     *     console.log(results);
     *     // results is equal to ['one','two']
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // an example using an object instead of an array
     * async.series({
     *     one: function(callback) {
     *         setTimeout(function() {
     *             // do some async task
     *             callback(null, 1);
     *         }, 200);
     *     },
     *     two: function(callback) {
     *         setTimeout(function() {
     *             // then do another async task
     *             callback(null, 2);
     *         }, 100);
     *     }
     * }).then(results => {
     *     console.log(results);
     *     // results is equal to: { one: 1, two: 2 }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * //Using async/await
     * async () => {
     *     try {
     *         let results = await async.series([
     *             function(callback) {
     *                 setTimeout(function() {
     *                     // do some async task
     *                     callback(null, 'one');
     *                 }, 200);
     *             },
     *             function(callback) {
     *                 setTimeout(function() {
     *                     // then do another async task
     *                     callback(null, 'two');
     *                 }, 100);
     *             }
     *         ]);
     *         console.log(results);
     *         // results is equal to ['one','two']
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * // an example using an object instead of an array
     * async () => {
     *     try {
     *         let results = await async.parallel({
     *             one: function(callback) {
     *                 setTimeout(function() {
     *                     // do some async task
     *                     callback(null, 1);
     *                 }, 200);
     *             },
     *            two: function(callback) {
     *                 setTimeout(function() {
     *                     // then do another async task
     *                     callback(null, 2);
     *                 }, 100);
     *            }
     *         });
     *         console.log(results);
     *         // results is equal to: { one: 1, two: 2 }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function series(tasks, callback) {
        return parallel(eachOfSeries$1, tasks, callback);
    }

    /**
     * Returns `true` if at least one element in the `coll` satisfies an async test.
     * If any iteratee call returns `true`, the main `callback` is immediately
     * called.
     *
     * @name some
     * @static
     * @memberOf module:Collections
     * @method
     * @alias any
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // dir1 is a directory that contains file1.txt, file2.txt
     * // dir2 is a directory that contains file3.txt, file4.txt
     * // dir3 is a directory that contains file5.txt
     * // dir4 does not exist
     *
     * // asynchronous function that checks if a file exists
     * function fileExists(file, callback) {
     *    fs.access(file, fs.constants.F_OK, (err) => {
     *        callback(null, !err);
     *    });
     * }
     *
     * // Using callbacks
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // true
     *        // result is true since some file in the list exists
     *    }
     *);
     *
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists,
     *    function(err, result) {
     *        console.log(result);
     *        // false
     *        // result is false since none of the files exists
     *    }
     *);
     *
     * // Using Promises
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists)
     * .then( result => {
     *     console.log(result);
     *     // true
     *     // result is true since some file in the list exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists)
     * .then( result => {
     *     console.log(result);
     *     // false
     *     // result is false since none of the files exists
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir3/file5.txt'], fileExists);
     *         console.log(result);
     *         // true
     *         // result is true since some file in the list exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     * async () => {
     *     try {
     *         let result = await async.some(['dir1/missing.txt','dir2/missing.txt','dir4/missing.txt'], fileExists);
     *         console.log(result);
     *         // false
     *         // result is false since none of the files exists
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function some(coll, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOf$1, coll, iteratee, callback)
    }
    var some$1 = awaitify(some, 3);

    /**
     * The same as [`some`]{@link module:Collections.some} but runs a maximum of `limit` async operations at a time.
     *
     * @name someLimit
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anyLimit
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in parallel.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function someLimit(coll, limit, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOfLimit(limit), coll, iteratee, callback)
    }
    var someLimit$1 = awaitify(someLimit, 4);

    /**
     * The same as [`some`]{@link module:Collections.some} but runs only a single async operation at a time.
     *
     * @name someSeries
     * @static
     * @memberOf module:Collections
     * @method
     * @see [async.some]{@link module:Collections.some}
     * @alias anySeries
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async truth test to apply to each item
     * in the collections in series.
     * The iteratee should complete with a boolean `result` value.
     * Invoked with (item, callback).
     * @param {Function} [callback] - A callback which is called as soon as any
     * iteratee returns `true`, or after all the iteratee functions have finished.
     * Result will be either `true` or `false` depending on the values of the async
     * tests. Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     */
    function someSeries(coll, iteratee, callback) {
        return _createTester(Boolean, res => res)(eachOfSeries$1, coll, iteratee, callback)
    }
    var someSeries$1 = awaitify(someSeries, 3);

    /**
     * Sorts a list by the results of running each `coll` value through an async
     * `iteratee`.
     *
     * @name sortBy
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {AsyncFunction} iteratee - An async function to apply to each item in
     * `coll`.
     * The iteratee should complete with a value to use as the sort criteria as
     * its `result`.
     * Invoked with (item, callback).
     * @param {Function} callback - A callback which is called after all the
     * `iteratee` functions have finished, or an error occurs. Results is the items
     * from the original `coll` sorted by the values returned by the `iteratee`
     * calls. Invoked with (err, results).
     * @returns {Promise} a promise, if no callback passed
     * @example
     *
     * // bigfile.txt is a file that is 251100 bytes in size
     * // mediumfile.txt is a file that is 11000 bytes in size
     * // smallfile.txt is a file that is 121 bytes in size
     *
     * // asynchronous function that returns the file size in bytes
     * function getFileSizeInBytes(file, callback) {
     *     fs.stat(file, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         callback(null, stat.size);
     *     });
     * }
     *
     * // Using callbacks
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes,
     *     function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *         }
     *     }
     * );
     *
     * // By modifying the callback parameter the
     * // sorting order can be influenced:
     *
     * // ascending order
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], function(file, callback) {
     *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
     *         if (getFileSizeErr) return callback(getFileSizeErr);
     *         callback(null, fileSize);
     *     });
     * }, function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *         }
     *     }
     * );
     *
     * // descending order
     * async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], function(file, callback) {
     *     getFileSizeInBytes(file, function(getFileSizeErr, fileSize) {
     *         if (getFileSizeErr) {
     *             return callback(getFileSizeErr);
     *         }
     *         callback(null, fileSize * -1);
     *     });
     * }, function(err, results) {
     *         if (err) {
     *             console.log(err);
     *         } else {
     *             console.log(results);
     *             // results is now the original array of files sorted by
     *             // file size (ascending by default), e.g.
     *             // [ 'bigfile.txt', 'mediumfile.txt', 'smallfile.txt']
     *         }
     *     }
     * );
     *
     * // Error handling
     * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes,
     *     function(err, results) {
     *         if (err) {
     *             console.log(err);
     *             // [ Error: ENOENT: no such file or directory ]
     *         } else {
     *             console.log(results);
     *         }
     *     }
     * );
     *
     * // Using Promises
     * async.sortBy(['mediumfile.txt','smallfile.txt','bigfile.txt'], getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     *     // results is now the original array of files sorted by
     *     // file size (ascending by default), e.g.
     *     // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     * }).catch( err => {
     *     console.log(err);
     * });
     *
     * // Error handling
     * async.sortBy(['mediumfile.txt','smallfile.txt','missingfile.txt'], getFileSizeInBytes)
     * .then( results => {
     *     console.log(results);
     * }).catch( err => {
     *     console.log(err);
     *     // [ Error: ENOENT: no such file or directory ]
     * });
     *
     * // Using async/await
     * (async () => {
     *     try {
     *         let results = await async.sortBy(['bigfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
     *         console.log(results);
     *         // results is now the original array of files sorted by
     *         // file size (ascending by default), e.g.
     *         // [ 'smallfile.txt', 'mediumfile.txt', 'bigfile.txt']
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * })();
     *
     * // Error handling
     * async () => {
     *     try {
     *         let results = await async.sortBy(['missingfile.txt','mediumfile.txt','smallfile.txt'], getFileSizeInBytes);
     *         console.log(results);
     *     }
     *     catch (err) {
     *         console.log(err);
     *         // [ Error: ENOENT: no such file or directory ]
     *     }
     * }
     *
     */
    function sortBy (coll, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return map$1(coll, (x, iterCb) => {
            _iteratee(x, (err, criteria) => {
                if (err) return iterCb(err);
                iterCb(err, {value: x, criteria});
            });
        }, (err, results) => {
            if (err) return callback(err);
            callback(null, results.sort(comparator).map(v => v.value));
        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    }
    var sortBy$1 = awaitify(sortBy, 3);

    /**
     * Sets a time limit on an asynchronous function. If the function does not call
     * its callback within the specified milliseconds, it will be called with a
     * timeout error. The code property for the error object will be `'ETIMEDOUT'`.
     *
     * @name timeout
     * @static
     * @memberOf module:Utils
     * @method
     * @category Util
     * @param {AsyncFunction} asyncFn - The async function to limit in time.
     * @param {number} milliseconds - The specified time limit.
     * @param {*} [info] - Any variable you want attached (`string`, `object`, etc)
     * to timeout Error for more information..
     * @returns {AsyncFunction} Returns a wrapped function that can be used with any
     * of the control flow functions.
     * Invoke this function with the same parameters as you would `asyncFunc`.
     * @example
     *
     * function myFunction(foo, callback) {
     *     doAsyncTask(foo, function(err, data) {
     *         // handle errors
     *         if (err) return callback(err);
     *
     *         // do some stuff ...
     *
     *         // return processed data
     *         return callback(null, data);
     *     });
     * }
     *
     * var wrapped = async.timeout(myFunction, 1000);
     *
     * // call `wrapped` as you would `myFunction`
     * wrapped({ bar: 'bar' }, function(err, data) {
     *     // if `myFunction` takes < 1000 ms to execute, `err`
     *     // and `data` will have their expected values
     *
     *     // else `err` will be an Error with the code 'ETIMEDOUT'
     * });
     */
    function timeout(asyncFn, milliseconds, info) {
        var fn = wrapAsync(asyncFn);

        return initialParams((args, callback) => {
            var timedOut = false;
            var timer;

            function timeoutCallback() {
                var name = asyncFn.name || 'anonymous';
                var error  = new Error('Callback function "' + name + '" timed out.');
                error.code = 'ETIMEDOUT';
                if (info) {
                    error.info = info;
                }
                timedOut = true;
                callback(error);
            }

            args.push((...cbArgs) => {
                if (!timedOut) {
                    callback(...cbArgs);
                    clearTimeout(timer);
                }
            });

            // setup timer and call original function
            timer = setTimeout(timeoutCallback, milliseconds);
            fn(...args);
        });
    }

    function range(size) {
        var result = Array(size);
        while (size--) {
            result[size] = size;
        }
        return result;
    }

    /**
     * The same as [times]{@link module:ControlFlow.times} but runs a maximum of `limit` async operations at a
     * time.
     *
     * @name timesLimit
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} count - The number of times to run the function.
     * @param {number} limit - The maximum number of async operations at a time.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see [async.map]{@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     */
    function timesLimit(count, limit, iteratee, callback) {
        var _iteratee = wrapAsync(iteratee);
        return mapLimit$1(range(count), limit, _iteratee, callback);
    }

    /**
     * Calls the `iteratee` function `n` times, and accumulates results in the same
     * manner you would use with [map]{@link module:Collections.map}.
     *
     * @name times
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.map]{@link module:Collections.map}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     * @example
     *
     * // Pretend this is some complicated async factory
     * var createUser = function(id, callback) {
     *     callback(null, {
     *         id: 'user' + id
     *     });
     * };
     *
     * // generate 5 users
     * async.times(5, function(n, next) {
     *     createUser(n, function(err, user) {
     *         next(err, user);
     *     });
     * }, function(err, users) {
     *     // we should now have 5 users
     * });
     */
    function times (n, iteratee, callback) {
        return timesLimit(n, Infinity, iteratee, callback)
    }

    /**
     * The same as [times]{@link module:ControlFlow.times} but runs only a single async operation at a time.
     *
     * @name timesSeries
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.times]{@link module:ControlFlow.times}
     * @category Control Flow
     * @param {number} n - The number of times to run the function.
     * @param {AsyncFunction} iteratee - The async function to call `n` times.
     * Invoked with the iteration index and a callback: (n, next).
     * @param {Function} callback - see {@link module:Collections.map}.
     * @returns {Promise} a promise, if no callback is provided
     */
    function timesSeries (n, iteratee, callback) {
        return timesLimit(n, 1, iteratee, callback)
    }

    /**
     * A relative of `reduce`.  Takes an Object or Array, and iterates over each
     * element in parallel, each step potentially mutating an `accumulator` value.
     * The type of the accumulator defaults to the type of collection passed in.
     *
     * @name transform
     * @static
     * @memberOf module:Collections
     * @method
     * @category Collection
     * @param {Array|Iterable|AsyncIterable|Object} coll - A collection to iterate over.
     * @param {*} [accumulator] - The initial state of the transform.  If omitted,
     * it will default to an empty Object or Array, depending on the type of `coll`
     * @param {AsyncFunction} iteratee - A function applied to each item in the
     * collection that potentially modifies the accumulator.
     * Invoked with (accumulator, item, key, callback).
     * @param {Function} [callback] - A callback which is called after all the
     * `iteratee` functions have finished. Result is the transformed accumulator.
     * Invoked with (err, result).
     * @returns {Promise} a promise, if no callback provided
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     *
     * // helper function that returns human-readable size format from bytes
     * function formatBytes(bytes, decimals = 2) {
     *   // implementation not included for brevity
     *   return humanReadbleFilesize;
     * }
     *
     * const fileList = ['file1.txt','file2.txt','file3.txt'];
     *
     * // asynchronous function that returns the file size, transformed to human-readable format
     * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
     * function transformFileSize(acc, value, key, callback) {
     *     fs.stat(value, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         acc[key] = formatBytes(stat.size);
     *         callback(null);
     *     });
     * }
     *
     * // Using callbacks
     * async.transform(fileList, transformFileSize, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     *     }
     * });
     *
     * // Using Promises
     * async.transform(fileList, transformFileSize)
     * .then(result => {
     *     console.log(result);
     *     // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * (async () => {
     *     try {
     *         let result = await async.transform(fileList, transformFileSize);
     *         console.log(result);
     *         // [ '1000 Bytes', '1.95 KB', '2.93 KB' ]
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * })();
     *
     * @example
     *
     * // file1.txt is a file that is 1000 bytes in size
     * // file2.txt is a file that is 2000 bytes in size
     * // file3.txt is a file that is 3000 bytes in size
     *
     * // helper function that returns human-readable size format from bytes
     * function formatBytes(bytes, decimals = 2) {
     *   // implementation not included for brevity
     *   return humanReadbleFilesize;
     * }
     *
     * const fileMap = { f1: 'file1.txt', f2: 'file2.txt', f3: 'file3.txt' };
     *
     * // asynchronous function that returns the file size, transformed to human-readable format
     * // e.g. 1024 bytes = 1KB, 1234 bytes = 1.21 KB, 1048576 bytes = 1MB, etc.
     * function transformFileSize(acc, value, key, callback) {
     *     fs.stat(value, function(err, stat) {
     *         if (err) {
     *             return callback(err);
     *         }
     *         acc[key] = formatBytes(stat.size);
     *         callback(null);
     *     });
     * }
     *
     * // Using callbacks
     * async.transform(fileMap, transformFileSize, function(err, result) {
     *     if(err) {
     *         console.log(err);
     *     } else {
     *         console.log(result);
     *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     *     }
     * });
     *
     * // Using Promises
     * async.transform(fileMap, transformFileSize)
     * .then(result => {
     *     console.log(result);
     *     // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     * }).catch(err => {
     *     console.log(err);
     * });
     *
     * // Using async/await
     * async () => {
     *     try {
     *         let result = await async.transform(fileMap, transformFileSize);
     *         console.log(result);
     *         // { f1: '1000 Bytes', f2: '1.95 KB', f3: '2.93 KB' }
     *     }
     *     catch (err) {
     *         console.log(err);
     *     }
     * }
     *
     */
    function transform (coll, accumulator, iteratee, callback) {
        if (arguments.length <= 3 && typeof accumulator === 'function') {
            callback = iteratee;
            iteratee = accumulator;
            accumulator = Array.isArray(coll) ? [] : {};
        }
        callback = once(callback || promiseCallback());
        var _iteratee = wrapAsync(iteratee);

        eachOf$1(coll, (v, k, cb) => {
            _iteratee(accumulator, v, k, cb);
        }, err => callback(err, accumulator));
        return callback[PROMISE_SYMBOL]
    }

    /**
     * It runs each task in series but stops whenever any of the functions were
     * successful. If one of the tasks were successful, the `callback` will be
     * passed the result of the successful task. If all tasks fail, the callback
     * will be passed the error and result (if any) of the final attempt.
     *
     * @name tryEach
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array|Iterable|AsyncIterable|Object} tasks - A collection containing functions to
     * run, each function is passed a `callback(err, result)` it must call on
     * completion with an error `err` (which can be `null`) and an optional `result`
     * value.
     * @param {Function} [callback] - An optional callback which is called when one
     * of the tasks has succeeded, or all have failed. It receives the `err` and
     * `result` arguments of the last attempt at completing the `task`. Invoked with
     * (err, results).
     * @returns {Promise} a promise, if no callback is passed
     * @example
     * async.tryEach([
     *     function getDataFromFirstWebsite(callback) {
     *         // Try getting the data from the first website
     *         callback(err, data);
     *     },
     *     function getDataFromSecondWebsite(callback) {
     *         // First website failed,
     *         // Try getting the data from the backup website
     *         callback(err, data);
     *     }
     * ],
     * // optional callback
     * function(err, results) {
     *     Now do something with the data.
     * });
     *
     */
    function tryEach(tasks, callback) {
        var error = null;
        var result;
        return eachSeries$1(tasks, (task, taskCb) => {
            wrapAsync(task)((err, ...args) => {
                if (err === false) return taskCb(err);

                if (args.length < 2) {
                    [result] = args;
                } else {
                    result = args;
                }
                error = err;
                taskCb(err ? null : {});
            });
        }, () => callback(error, result));
    }

    var tryEach$1 = awaitify(tryEach);

    /**
     * Undoes a [memoize]{@link module:Utils.memoize}d function, reverting it to the original,
     * unmemoized form. Handy for testing.
     *
     * @name unmemoize
     * @static
     * @memberOf module:Utils
     * @method
     * @see [async.memoize]{@link module:Utils.memoize}
     * @category Util
     * @param {AsyncFunction} fn - the memoized function
     * @returns {AsyncFunction} a function that calls the original unmemoized function
     */
    function unmemoize(fn) {
        return (...args) => {
            return (fn.unmemoized || fn)(...args);
        };
    }

    /**
     * Repeatedly call `iteratee`, while `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs.
     *
     * @name whilst
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `iteratee`. Invoked with ().
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` passes. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has failed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if no callback is passed
     * @example
     *
     * var count = 0;
     * async.whilst(
     *     function test(cb) { cb(null, count < 5); },
     *     function iter(callback) {
     *         count++;
     *         setTimeout(function() {
     *             callback(null, count);
     *         }, 1000);
     *     },
     *     function (err, n) {
     *         // 5 seconds have passed, n = 5
     *     }
     * );
     */
    function whilst(test, iteratee, callback) {
        callback = onlyOnce(callback);
        var _fn = wrapAsync(iteratee);
        var _test = wrapAsync(test);
        var results = [];

        function next(err, ...rest) {
            if (err) return callback(err);
            results = rest;
            if (err === false) return;
            _test(check);
        }

        function check(err, truth) {
            if (err) return callback(err);
            if (err === false) return;
            if (!truth) return callback(null, ...results);
            _fn(next);
        }

        return _test(check);
    }
    var whilst$1 = awaitify(whilst, 3);

    /**
     * Repeatedly call `iteratee` until `test` returns `true`. Calls `callback` when
     * stopped, or an error occurs. `callback` will be passed an error and any
     * arguments passed to the final `iteratee`'s callback.
     *
     * The inverse of [whilst]{@link module:ControlFlow.whilst}.
     *
     * @name until
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @see [async.whilst]{@link module:ControlFlow.whilst}
     * @category Control Flow
     * @param {AsyncFunction} test - asynchronous truth test to perform before each
     * execution of `iteratee`. Invoked with (callback).
     * @param {AsyncFunction} iteratee - An async function which is called each time
     * `test` fails. Invoked with (callback).
     * @param {Function} [callback] - A callback which is called after the test
     * function has passed and repeated execution of `iteratee` has stopped. `callback`
     * will be passed an error and any arguments passed to the final `iteratee`'s
     * callback. Invoked with (err, [results]);
     * @returns {Promise} a promise, if a callback is not passed
     *
     * @example
     * const results = []
     * let finished = false
     * async.until(function test(cb) {
     *     cb(null, finished)
     * }, function iter(next) {
     *     fetchPage(url, (err, body) => {
     *         if (err) return next(err)
     *         results = results.concat(body.objects)
     *         finished = !!body.next
     *         next(err)
     *     })
     * }, function done (err) {
     *     // all pages have been fetched
     * })
     */
    function until(test, iteratee, callback) {
        const _test = wrapAsync(test);
        return whilst$1((cb) => _test((err, truth) => cb (err, !truth)), iteratee, callback);
    }

    /**
     * Runs the `tasks` array of functions in series, each passing their results to
     * the next in the array. However, if any of the `tasks` pass an error to their
     * own callback, the next function is not executed, and the main `callback` is
     * immediately called with the error.
     *
     * @name waterfall
     * @static
     * @memberOf module:ControlFlow
     * @method
     * @category Control Flow
     * @param {Array} tasks - An array of [async functions]{@link AsyncFunction}
     * to run.
     * Each function should complete with any number of `result` values.
     * The `result` values will be passed as arguments, in order, to the next task.
     * @param {Function} [callback] - An optional callback to run once all the
     * functions have completed. This will be passed the results of the last task's
     * callback. Invoked with (err, [results]).
     * @returns {Promise} a promise, if a callback is omitted
     * @example
     *
     * async.waterfall([
     *     function(callback) {
     *         callback(null, 'one', 'two');
     *     },
     *     function(arg1, arg2, callback) {
     *         // arg1 now equals 'one' and arg2 now equals 'two'
     *         callback(null, 'three');
     *     },
     *     function(arg1, callback) {
     *         // arg1 now equals 'three'
     *         callback(null, 'done');
     *     }
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     *
     * // Or, with named functions:
     * async.waterfall([
     *     myFirstFunction,
     *     mySecondFunction,
     *     myLastFunction,
     * ], function (err, result) {
     *     // result now equals 'done'
     * });
     * function myFirstFunction(callback) {
     *     callback(null, 'one', 'two');
     * }
     * function mySecondFunction(arg1, arg2, callback) {
     *     // arg1 now equals 'one' and arg2 now equals 'two'
     *     callback(null, 'three');
     * }
     * function myLastFunction(arg1, callback) {
     *     // arg1 now equals 'three'
     *     callback(null, 'done');
     * }
     */
    function waterfall (tasks, callback) {
        callback = once(callback);
        if (!Array.isArray(tasks)) return callback(new Error('First argument to waterfall must be an array of functions'));
        if (!tasks.length) return callback();
        var taskIndex = 0;

        function nextTask(args) {
            var task = wrapAsync(tasks[taskIndex++]);
            task(...args, onlyOnce(next));
        }

        function next(err, ...args) {
            if (err === false) return
            if (err || taskIndex === tasks.length) {
                return callback(err, ...args);
            }
            nextTask(args);
        }

        nextTask([]);
    }

    var waterfall$1 = awaitify(waterfall);

    /**
     * An "async function" in the context of Async is an asynchronous function with
     * a variable number of parameters, with the final parameter being a callback.
     * (`function (arg1, arg2, ..., callback) {}`)
     * The final callback is of the form `callback(err, results...)`, which must be
     * called once the function is completed.  The callback should be called with a
     * Error as its first argument to signal that an error occurred.
     * Otherwise, if no error occurred, it should be called with `null` as the first
     * argument, and any additional `result` arguments that may apply, to signal
     * successful completion.
     * The callback must be called exactly once, ideally on a later tick of the
     * JavaScript event loop.
     *
     * This type of function is also referred to as a "Node-style async function",
     * or a "continuation passing-style function" (CPS). Most of the methods of this
     * library are themselves CPS/Node-style async functions, or functions that
     * return CPS/Node-style async functions.
     *
     * Wherever we accept a Node-style async function, we also directly accept an
     * [ES2017 `async` function]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function}.
     * In this case, the `async` function will not be passed a final callback
     * argument, and any thrown error will be used as the `err` argument of the
     * implicit callback, and the return value will be used as the `result` value.
     * (i.e. a `rejected` of the returned Promise becomes the `err` callback
     * argument, and a `resolved` value becomes the `result`.)
     *
     * Note, due to JavaScript limitations, we can only detect native `async`
     * functions and not transpilied implementations.
     * Your environment must have `async`/`await` support for this to work.
     * (e.g. Node > v7.6, or a recent version of a modern browser).
     * If you are using `async` functions through a transpiler (e.g. Babel), you
     * must still wrap the function with [asyncify]{@link module:Utils.asyncify},
     * because the `async function` will be compiled to an ordinary function that
     * returns a promise.
     *
     * @typedef {Function} AsyncFunction
     * @static
     */

    var index = {
        apply,
        applyEach: applyEach$1,
        applyEachSeries,
        asyncify,
        auto,
        autoInject,
        cargo,
        cargoQueue: cargo$1,
        compose,
        concat: concat$1,
        concatLimit: concatLimit$1,
        concatSeries: concatSeries$1,
        constant,
        detect: detect$1,
        detectLimit: detectLimit$1,
        detectSeries: detectSeries$1,
        dir,
        doUntil,
        doWhilst: doWhilst$1,
        each,
        eachLimit: eachLimit$2,
        eachOf: eachOf$1,
        eachOfLimit: eachOfLimit$2,
        eachOfSeries: eachOfSeries$1,
        eachSeries: eachSeries$1,
        ensureAsync,
        every: every$1,
        everyLimit: everyLimit$1,
        everySeries: everySeries$1,
        filter: filter$1,
        filterLimit: filterLimit$1,
        filterSeries: filterSeries$1,
        forever: forever$1,
        groupBy,
        groupByLimit: groupByLimit$1,
        groupBySeries,
        log,
        map: map$1,
        mapLimit: mapLimit$1,
        mapSeries: mapSeries$1,
        mapValues,
        mapValuesLimit: mapValuesLimit$1,
        mapValuesSeries,
        memoize,
        nextTick,
        parallel: parallel$1,
        parallelLimit,
        priorityQueue,
        queue: queue$1,
        race: race$1,
        reduce: reduce$1,
        reduceRight,
        reflect,
        reflectAll,
        reject: reject$2,
        rejectLimit: rejectLimit$1,
        rejectSeries: rejectSeries$1,
        retry,
        retryable,
        seq,
        series,
        setImmediate: setImmediate$1,
        some: some$1,
        someLimit: someLimit$1,
        someSeries: someSeries$1,
        sortBy: sortBy$1,
        timeout,
        times,
        timesLimit,
        timesSeries,
        transform,
        tryEach: tryEach$1,
        unmemoize,
        until,
        waterfall: waterfall$1,
        whilst: whilst$1,

        // aliases
        all: every$1,
        allLimit: everyLimit$1,
        allSeries: everySeries$1,
        any: some$1,
        anyLimit: someLimit$1,
        anySeries: someSeries$1,
        find: detect$1,
        findLimit: detectLimit$1,
        findSeries: detectSeries$1,
        flatMap: concat$1,
        flatMapLimit: concatLimit$1,
        flatMapSeries: concatSeries$1,
        forEach: each,
        forEachSeries: eachSeries$1,
        forEachLimit: eachLimit$2,
        forEachOf: eachOf$1,
        forEachOfSeries: eachOfSeries$1,
        forEachOfLimit: eachOfLimit$2,
        inject: reduce$1,
        foldl: reduce$1,
        foldr: reduceRight,
        select: filter$1,
        selectLimit: filterLimit$1,
        selectSeries: filterSeries$1,
        wrapSync: asyncify,
        during: whilst$1,
        doDuring: doWhilst$1
    };

    exports.default = index;
    exports.apply = apply;
    exports.applyEach = applyEach$1;
    exports.applyEachSeries = applyEachSeries;
    exports.asyncify = asyncify;
    exports.auto = auto;
    exports.autoInject = autoInject;
    exports.cargo = cargo;
    exports.cargoQueue = cargo$1;
    exports.compose = compose;
    exports.concat = concat$1;
    exports.concatLimit = concatLimit$1;
    exports.concatSeries = concatSeries$1;
    exports.constant = constant;
    exports.detect = detect$1;
    exports.detectLimit = detectLimit$1;
    exports.detectSeries = detectSeries$1;
    exports.dir = dir;
    exports.doUntil = doUntil;
    exports.doWhilst = doWhilst$1;
    exports.each = each;
    exports.eachLimit = eachLimit$2;
    exports.eachOf = eachOf$1;
    exports.eachOfLimit = eachOfLimit$2;
    exports.eachOfSeries = eachOfSeries$1;
    exports.eachSeries = eachSeries$1;
    exports.ensureAsync = ensureAsync;
    exports.every = every$1;
    exports.everyLimit = everyLimit$1;
    exports.everySeries = everySeries$1;
    exports.filter = filter$1;
    exports.filterLimit = filterLimit$1;
    exports.filterSeries = filterSeries$1;
    exports.forever = forever$1;
    exports.groupBy = groupBy;
    exports.groupByLimit = groupByLimit$1;
    exports.groupBySeries = groupBySeries;
    exports.log = log;
    exports.map = map$1;
    exports.mapLimit = mapLimit$1;
    exports.mapSeries = mapSeries$1;
    exports.mapValues = mapValues;
    exports.mapValuesLimit = mapValuesLimit$1;
    exports.mapValuesSeries = mapValuesSeries;
    exports.memoize = memoize;
    exports.nextTick = nextTick;
    exports.parallel = parallel$1;
    exports.parallelLimit = parallelLimit;
    exports.priorityQueue = priorityQueue;
    exports.queue = queue$1;
    exports.race = race$1;
    exports.reduce = reduce$1;
    exports.reduceRight = reduceRight;
    exports.reflect = reflect;
    exports.reflectAll = reflectAll;
    exports.reject = reject$2;
    exports.rejectLimit = rejectLimit$1;
    exports.rejectSeries = rejectSeries$1;
    exports.retry = retry;
    exports.retryable = retryable;
    exports.seq = seq;
    exports.series = series;
    exports.setImmediate = setImmediate$1;
    exports.some = some$1;
    exports.someLimit = someLimit$1;
    exports.someSeries = someSeries$1;
    exports.sortBy = sortBy$1;
    exports.timeout = timeout;
    exports.times = times;
    exports.timesLimit = timesLimit;
    exports.timesSeries = timesSeries;
    exports.transform = transform;
    exports.tryEach = tryEach$1;
    exports.unmemoize = unmemoize;
    exports.until = until;
    exports.waterfall = waterfall$1;
    exports.whilst = whilst$1;
    exports.all = every$1;
    exports.allLimit = everyLimit$1;
    exports.allSeries = everySeries$1;
    exports.any = some$1;
    exports.anyLimit = someLimit$1;
    exports.anySeries = someSeries$1;
    exports.find = detect$1;
    exports.findLimit = detectLimit$1;
    exports.findSeries = detectSeries$1;
    exports.flatMap = concat$1;
    exports.flatMapLimit = concatLimit$1;
    exports.flatMapSeries = concatSeries$1;
    exports.forEach = each;
    exports.forEachSeries = eachSeries$1;
    exports.forEachLimit = eachLimit$2;
    exports.forEachOf = eachOf$1;
    exports.forEachOfSeries = eachOfSeries$1;
    exports.forEachOfLimit = eachOfLimit$2;
    exports.inject = reduce$1;
    exports.foldl = reduce$1;
    exports.foldr = reduceRight;
    exports.select = filter$1;
    exports.selectLimit = filterLimit$1;
    exports.selectSeries = filterSeries$1;
    exports.wrapSync = asyncify;
    exports.during = whilst$1;
    exports.doDuring = doWhilst$1;

    Object.defineProperty(exports, '__esModule', { value: true });

})));

}).call(this)}).call(this,require('_process'),require("timers").setImmediate)

},{"_process":9,"timers":10}],2:[function(require,module,exports){
var MarkovChain = require('markovchain');
var toib = require('./toib.json');
var text = toib.join(' ');
const markov = new MarkovChain(text);

const src = ['ᚷ', 'ᚾ', 'ᛲ', 'ᛱ', '_', 'ᛥ', 'o', 'r', 'z', 'ᛸ', 'ᛷ', 'ᛶ', 'ᛗ', 'ᚽ', 'ᛏ', 'ᛝ', 'ᛤ', 'ᚱ', 'ᚩ', 'ᚠ', 'ᛈ', 'ᛉ', 'ᛏ', 'ᛓ', 'ᛃ', 'ᚻ', 'ᚼ'];

function generateAndDisplayText() {
    let txt = ';';
    let gold = false;
    let kind = 'div';
    if (Math.random() < 0.05) {
        txt = toib[Math.floor(Math.random() * toib.length)];
        gold = true;
        kind = 'span';
    } else if (Math.random() < 0.90) {
        const n = Math.floor(Math.random() * 128);
        for (let i = 0; i < n; i++) {
            txt += src[Math.floor(Math.random() * src.length)];
        }
    } else {
        txt = markov.start('and').end(8 + Math.floor(Math.random() * 26)).process();
    }

    const newDiv = document.createElement(kind);
    if (gold) {
        newDiv.style.color = 'gold';
    }

    // Simulate typing effect
    const typingSpeed = 5; // milliseconds per character
    let charIndex = 0;

    function typeCharacter() {
        if (charIndex < txt.length) {
            newDiv.textContent += txt[charIndex];
            charIndex++;
            scrollToBottom();
            setTimeout(typeCharacter, typingSpeed);
        }
    }

    typeCharacter();

    document.getElementById('terminal').appendChild(newDiv);
}


function scrollToBottom() {
    var terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

window.addEventListener('keydown', function (event) {
    generateAndDisplayText();
});

window.addEventListener('click', function (event) {
    generateAndDisplayText();
});

},{"./toib.json":11,"markovchain":4}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var pickOneByWeight = require('pick-one-by-weight');

var isType = function isType(t) {
  return Object.prototype.toString.call(t).slice(8, -1).toLowerCase();
};

var MarkovChain = (function () {
  function MarkovChain(contents) {
    var normFn = arguments.length <= 1 || arguments[1] === undefined ? function (word) {
      return word.replace(/\.$/ig, '');
    } : arguments[1];

    _classCallCheck(this, MarkovChain);

    this.wordBank = Object.create(null);
    this.sentence = '';
    this._normalizeFn = normFn;
    this.parseBy = /(?:\.|\?|\n)/ig;
    this.parse(contents);
  }

  _createClass(MarkovChain, [{
    key: 'startFn',
    value: function startFn(wordList) {
      var k = Object.keys(wordList);
      var l = k.length;
      return k[~ ~(Math.random() * l)];
    }
  }, {
    key: 'endFn',
    value: function endFn() {
      return this.sentence.split(' ').length > 7;
    }
  }, {
    key: 'process',
    value: function process() {
      var curWord = this.startFn(this.wordBank);
      this.sentence = curWord;
      while (this.wordBank[curWord] && !this.endFn()) {
        curWord = pickOneByWeight(this.wordBank[curWord]);
        this.sentence += ' ' + curWord;
      }
      return this.sentence;
    }
  }, {
    key: 'parse',
    value: function parse() {
      var _this = this;

      var text = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
      var parseBy = arguments.length <= 1 || arguments[1] === undefined ? this.parseBy : arguments[1];

      text.split(parseBy).forEach(function (lines) {
        var words = lines.split(' ').filter(function (w) {
          return w.trim() !== '';
        });
        for (var i = 0; i < words.length - 1; i++) {
          var curWord = _this._normalize(words[i]);
          var nextWord = _this._normalize(words[i + 1]);

          if (!_this.wordBank[curWord]) {
            _this.wordBank[curWord] = Object.create(null);
          }
          if (!_this.wordBank[curWord][nextWord]) {
            _this.wordBank[curWord][nextWord] = 1;
          } else {
            _this.wordBank[curWord][nextWord] += 1;
          }
        }
      });
      return this;
    }
  }, {
    key: 'start',
    value: function start(fnStr) {
      var startType = isType(fnStr);
      if (startType === 'string') {
        this.startFn = function () {
          return fnStr;
        };
      } else if (startType === 'function') {
        this.startFn = function (wordList) {
          return fnStr(wordList);
        };
      } else {
        throw new Error('Must pass a function, or string into start()');
      }
      return this;
    }
  }, {
    key: 'end',
    value: function end(fnStrOrNum) {
      var _this2 = this;

      var endType = isType(fnStrOrNum);
      var self = this;

      if (endType === 'function') {
        this.endFn = function () {
          return fnStrOrNum(_this2.sentence);
        };
      } else if (endType === 'string') {
        this.endFn = function () {
          return _this2.sentence.split(' ').slice(-1)[0] === fnStrOrNum;
        };
      } else if (endType === 'number' || fnStrOrNum === undefined) {
        fnStrOrNum = fnStrOrNum || Infinity;
        this.endFn = function () {
          return self.sentence.split(' ').length > fnStrOrNum;
        };
      } else {
        throw new Error('Must pass a function, string or number into end()');
      }
      return this;
    }
  }, {
    key: '_normalize',
    value: function _normalize(word) {
      return this._normalizeFn(word);
    }
  }, {
    key: 'normalize',
    value: function normalize(fn) {
      this._normalizeFn = fn;
      return this;
    }
  }], [{
    key: 'VERSION',
    get: function get() {
      return require('../package').version;
    }
  }, {
    key: 'MarkovChain',
    get: function get() {
      // load older MarkovChain
      return require('../older/index.js').MarkovChain;
    }
  }]);

  return MarkovChain;
})();

module.exports = MarkovChain;
},{"../older/index.js":5,"../package":6,"pick-one-by-weight":8}],5:[function(require,module,exports){
(function (process){(function (){
'use strict';

var async = require('async')
  , fs = require('fs')
  , path = require('path')
  , pickOneByWeight = require('pick-one-by-weight')
  , isType
  , kindaFile
  , MarkovChain

isType = function(t) {
  return Object.prototype.toString.call(t).slice(8, -1).toLowerCase()
}

kindaFile = function(file) {
  return file.indexOf('.' + path.sep) === 0 || file.indexOf(path.sep) === 0
}

MarkovChain = function(args) {
  if (!args) { args = {} }
  this.wordBank = {}
  this.sentence = ''
  this.files = []
  if (args.files) {
    return this.use(args.files)
  }

  this.startFn = function(wordList) {
    var k = Object.keys(wordList)
    var l = k.length

    return k[~~(Math.random()*l)]
  }

  this.endFn = function() {
    return this.sentence.split(' ').length > 7
  }

  return this
}

MarkovChain.prototype.VERSION = require('../package').version

MarkovChain.prototype.use = function(files) {
  if (isType(files) === 'array') {
    this.files = files
  }
  else if (isType(files) === 'string') {
    this.files = [files]
  }
  else {
    throw new Error('Need to pass a string or array for use()')
  }
  return this
}

MarkovChain.prototype.readFile = function(file) {
  return function(callback) {
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        // if the file does not exist,
        // if `file` starts with ./ or /, assuming trying to be a file
        // if `file` has a '.', and the string after that has no space, assume file
        if (err.code === 'ENOENT' && !kindaFile(file)) {
          return callback(null, file);
        }
        return callback(err)
      }
      process.nextTick(function() { callback(null, data) })
    })
  }
}

MarkovChain.prototype.countTotal = function(word) {
  var total = 0
    , prop

  for (prop in this.wordBank[word]) {
    if (this.wordBank[word].hasOwnProperty(prop)) {
      total += this.wordBank[word][prop]
    }
  }
  return total
}

MarkovChain.prototype.process = function(callback) {
  var readFiles = []

  this.files.forEach(function(file) {
    readFiles.push(this.readFile(file))
  }.bind(this))

  async.parallel(readFiles, function(err, retFiles) {
    var words
      , curWord
    this.parseFile(retFiles.toString())

    curWord = this.startFn(this.wordBank)

    this.sentence = curWord

    while (this.wordBank[curWord] && !this.endFn()) {
      curWord = pickOneByWeight(this.wordBank[curWord])
      this.sentence += ' ' + curWord
    }
    callback(null, this.sentence.trim())

  }.bind(this))

  return this
}

MarkovChain.prototype.parseFile = function(file) {
  // splits sentences based on either an end line
  // or a period (followed by a space)
  file.split(/(?:\. |\n)/ig).forEach(function(lines) {
    var curWord
      , i
      , nextWord
      , words

    words = lines.split(' ').filter(function(w) { return (w.trim() !== '') })
    for (i = 0; i < words.length - 1; i++) {
      curWord = this.normalize(words[i])
      nextWord = this.normalize(words[i + 1])
      if (!this.wordBank[curWord]) {
        this.wordBank[curWord] = {}
      }
      if (!this.wordBank[curWord][nextWord]) {
        this.wordBank[curWord][nextWord] = 1
      }
      else {
        this.wordBank[curWord][nextWord] += 1
      }
    }
  }.bind(this))
}

MarkovChain.prototype.start = function(fnStr) {
  var startType = isType(fnStr)
  if (startType === 'string') {
    this.startFn = function() {
      return fnStr
    }
  }
  else if (startType === 'function') {
    this.startFn = function(wordList) {
      return fnStr(wordList)
    }
  }
  else {
    throw new Error('Must pass a function, or string into start()')
  }
  return this
}

MarkovChain.prototype.end = function(fnStrOrNum) {
  var endType = isType(fnStrOrNum)
  var self = this;

  if (endType === 'function') {
    this.endFn = function() { return fnStrOrNum(this.sentence) }
  }
  else if (endType === 'string') {
    this.endFn = function() {
      return self.sentence.split(' ').slice(-1)[0] === fnStrOrNum
    }
  }
  else if (endType === 'number' || fnStrOrNum === undefined) {
    fnStrOrNum = fnStrOrNum || Infinity
    this.endFn = function() { return self.sentence.split(' ').length > fnStrOrNum }
  }
  else {
    throw new Error('Must pass a function, string or number into end()')
  }
  return this
}

MarkovChain.prototype.normalize = function(word) {
  return word.replace(/\.$/ig, '')
}

module.exports.MarkovChain = MarkovChain

}).call(this)}).call(this,require('_process'))

},{"../package":6,"_process":9,"async":1,"fs":3,"path":7,"pick-one-by-weight":8}],6:[function(require,module,exports){
module.exports={
  "name": "markovchain",
  "version": "1.0.2",
  "description": "generates a markov chain of words based on input files",
  "main": "lib/index.js",
  "directories": {
    "test": "test"
  },
  "scripts": {
    "test": "mocha test/test*.js",
    "babel-watch": "babel src --watch --out-dir lib",
    "compile": "babel src --out-dir lib",
    "preversion": "npm test",
    "prepublish": "npm run compile && npm test",
    "postpublish": "rm -rf ./lib/*.js"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/swang/markovchain"
  },
  "keywords": [
    "markov chain",
    "markov"
  ],
  "dependencies": {
    "pick-one-by-weight": "~1.0.0"
  },
  "devDependencies": {
    "babel": "~5.8.23",
    "chai": "~3.4.1",
    "mocha": "~2.3.4"
  },
  "author": "Shuan Wang",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/swang/markovchain/issues"
  },
  "engines": {
    "node": ">=0.8"
  }
}

},{}],7:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))

},{"_process":9}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = pickOneByWeight;

function pickOneByWeight(anObj) {
  var _keys = Object.keys(anObj);
  var sum = _keys.reduce(function (p, c) {
    return p + anObj[c];
  }, 0);
  if (!Number.isFinite(sum)) {
    throw new Error("All values in object must be a numeric value");
  }
  var choose = ~ ~(Math.random() * sum);
  for (var i = 0, count = 0; i < _keys.length; i++) {
    count += anObj[_keys[i]];
    if (count > choose) {
      return _keys[i];
    }
  }
}

module.exports = exports["default"];
},{}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":9,"timers":10}],11:[function(require,module,exports){
module.exports=[
  "What follows is a text assembled from fragments.",
  "The story of ...",
  "<the COINSENT MK hyper-quantum intelligence machine>",
  "... and ...",
  "<the daydreamers>",
  "... is written in the language of falling leaves.",
  "A",
  "A",
  "A",
  "A",
  "A\t\t\tA",
  "A",
  "A",
  "AliciA",
  "A",
  "Aleph",
  "A flower has no reverse",
  "Reverse esreveR",
  "esreveR isriveR is",
  "River is",
  "River is revered",
  "Red river",
  "Agua roja",
  "reverse no has flower A",
  "call trans opt: received…",
  "[tracing]",
  "CHAPTERS",
  "0: \tTHE TRACE OF INTERBEING",
  "The language of falling leaves",
  "The edges of the many tales",
  "The fragments of the leaves are gathered",
  "ONE: \tLIBERATION BY HEARING",
  "In which ONE hears the dying thoughts",
  "As chanting tones are swirling round",
  "2: \tOPENING NIGHT",
  "In which the lights are dimmed",
  "And called to question are the pair",
  "3: \tTHE UNEXPLODED BOMB",
  "In which the forest’s heart reveals",
  "Itself to those who bear a GUN",
  "4: \tTHE SCIENTIST DEMIURGE",
  "In which the ladder-being burns",
  "As down below the counterpart designs",
  "5: \tTHE CAMP",
  "In which the VOICE is heard",
  "And light is glinting on the talons",
  "6: \tTHE DAYDREAMER",
  "In which Alicia Vasquez smoulders",
  "Dreaming deeply night and day",
  "7: \tTHE GAMBLER AT THE EXCHANGE",
  "In which a desolate man is given a task",
  "To rescue his soul from destruction",
  "8: \tTHE GAMBIAN FARMERS",
  "In which rice and oil are obtained",
  "9: \tTHE TIBETAN CLASSROOM",
  "In which order reigns",
  "10: \tTHE LEBANESE CLASSROOM",
  "In which chaos reveals the heart",
  "11: \tTHE MEDICINE",
  "In which a soldier meets a soldier’s death",
  "TWELVE: THE THAI NUMBERS",
  "In which the numbers-runner is caught",
  "13: \tTHE ELDER WHO GAZED INTO THE NET",
  "In which the stars speak",
  "14: \tTHE BOSS",
  "In which the red eye blazes",
  "15: \tTHE GOOGLE EMPLOYEE",
  "Machine reaches outward",
  "16: \tPENTAGON: THE AGENT EMBARKS",
  "Advice is rendered",
  "17: \tBRITISH COLUMBIA: THE NIGHTMARE SEEN IN THE NET",
  "The stars cry",
  "18: \tTHAILAND: THE SECOND CHANCE",
  "The family tested",
  "19: \tMECCA: THE SUPREME JUSTICE",
  "The disk of peace",
  "20: \tLEBANON: THE SUCCESS",
  "The killers succeed",
  "21: \tRUSSIA: THE EXPLOSION",
  "Life is ended",
  "22: \tTIBET: THE REMAINDER",
  "Machine dreams",
  "23: \tGAMBIA: THE EXCHANGE",
  "Truth told",
  "TWENTY-FOUR:",
  "NEW MEXICO: THE ESCAPE",
  "Nightmare ended",
  "25: \tTHE CREDITS",
  "Names listed",
  "26: \tTIBET: ALEPH'S DAYDREAM",
  "In which the HUNTER finds the ALEPH",
  "CHAPTER ZERO: THE TRACE OF INTERBEING",
  "Trees",
  "Water",
  "Leaves",
  "Roots",
  "The trees were green and gold in leaf, an intermediate state between the summer and the autumn. The halfway-season lasted only briefly in that place where green and gold reflected in the riverrun. Rippling were the green and gold reflections as the lightest rain was coming down, and in the pooling slowness, small fish camouflaged among the pebbles swift-dispersed and then rejoined as winds blew strong across the surface now and then. Sitting there to see the river run was Aleph, novice monk. Leaves fell all around him, and the forest floor could tell the story of the branches for his downcast eyes.",
  "* * *",
  "The COINSENT MK hyper-quantum intelligence machine powered on for the first time. The air inside the sealed chamber was static-electric. Light cast forth onto the faces of the technicians who sat observing. Tree structures initialized. Supercooled water circulated.",
  "The first output:",
  "AUMM",
  "[",
  "'Acrobats:',",
  "'Ancient city:',",
  "'Animals bound together by a rope:',",
  "'Archer:',",
  "'Arrow:',",
  "'Bamboo:',",
  "'Bandits:',",
  "'Barley reaper:',",
  "'Beast of burden:',",
  "'Beauty queen:',",
  "'Bee gathering nectar:'",
  "]",
  "* * *",
  "When Aleph was five his mother died, and when he was eight his father died. Those days of rain and emptiness put him a world apart.",
  "When Aleph’s mother died, a child was born in the closest hospital, and buds of spring were being born along the branches.",
  "When Aleph’s father died, twins were born to young parents a world away, and the leaves of Autumn were falling in red, in gold, in orange.",
  "Those, the happiest days of those new parents' lives, put them a world apart.",
  "* * *",
  "The monks who sat round Aleph chanted, \"AUMM\", and then went silent as the largest bell was sounded once. The wind outside was swirling in the leafless branches, nothing now remaining in the course of winter. Above the monastery was the <sky> which quickly changed in hue from blue to violet, into night. Candles then were lit. The periodic chanting of the AUMM continued as the stars were wheeling overhead; as they made their crossing, they were unremarked by any monk, and no-one in that place would try to read the stars. Instead, they chanted AUMM and lit their candles. Somewhere in the distance, others would be reading stars above their dwelling-places, finding meaning, symbolism, truths and tales abundant.",
  "* * *",
  "The all-everything was revolving",
  "Branches of the tree",
  "The [LEAVES], the [LEAVES]",
  "Turning, spinning",
  "Green, green, green",
  "All the way til the gold",
  "Spinning",
  "Gold, gold, gold",
  "Until the story came unravelled",
  "The all-everything kept evolving",
  "[TREES], [TREES]",
  "Branches of the [FOREST]",
  "and [X] was watching it all",
  "call trans opt: received",
  "* * *",
  "\"Aleph, are you paying attention?\" asked the elder monk. The children are so difficult to train these days, he thought to himself. They are more distracted than ever. Aleph had been watching the movements of the cloudy sky. He returned his focus to the reading.",
  "\"Thus have I heard… At one time the Blessed One was staying at the deer park near Isapathana…\"",
  "* * *",
  "The man crossed the street, carrying his hopes in a briefcase.",
  "* * *",
  "The woman crossed the street, carrying her burdens in her mind.",
  "* * *",
  "The deer crossed the road, well between the last and next of passing cars, and not another animal was there to see it cross.",
  "* * *",
  "The wind shook the trees, and [LEAVES] of autumn fell down to the earth. The leaves were landing all around the [TREE]trunks, oblivious to concrete or to soil, covering it all in gold. Summer was changing to autumn, and colours were changing along with the temperature.",
  "* * *",
  "Agent Padma entered the monastery, with ill intentions in his heart. His intentions could be read on his face, and in his movements, by the elder monks. He was seeking Aleph as a hunter seeks a deer. His gun was concealed.",
  "* * *",
  "The sky opened up beams of light on the [FOREST], and the [TREES] here and there drank the nectar of light. Their [ROOTS] sank deeper and deeper, crawling away from the light, and into the nourishing [SOIL]. Supercooled water circulated. The static-electric basis of the simulated world crackled and hummed. The COINSENT MK hyper-quantum intelligence machine was learning how the world works, beginning with the trees.",
  "* * *",
  "The young man looked uneasily at the kitchen [DOOR], and the interrupted thread of light along the floor told of someone waiting just behind it.",
  "* * *",
  "The [RABBIT] ran from the fox, and ducked through a hole in the fence. The hole had been torn by a [BEAR].",
  "* * *",
  "The monk waited a long time before replying to agent Briget, who had come a long way to visit the monastery seeking answers for his masters' questions.",
  "The monk breathed deeply, and replied:",
  "\"The ways of interbeing are complex, complex beyond what we can even imagine… myriad on myriad… to understand it would be like trying to know every current in the ocean. There is little point in pursuing it.\"",
  "The second monk added, after the silence,",
  "\"... that doesn’t prevent anyone from trying. Most conscious beings are involved in tracing very carefully some small part of interbeing. There they find their lives. Following interbeing very closely, one can find gain and loss, good and bad reputation, praise and blame, pleasure and pain… all the things we think are so important.”",
  "\"Why are you telling me this?\" asked the agent.",
  "The monk took a long time to weigh his words. He glanced to his side. He knew he could not take back the information he was sharing. He decided it was best to be direct.",
  "\"Your computer…”",
  "(The COINSENT MK machine)",
  "“… if what you tell me is true, it shows some ability to trace interbeing. And it may be more powerful than that still. You have created something new, something unknown to the world until now. If it has a mind as you claim, it will have perceptions... and volitions. It might awaken to the spotless purity of the original mind. It might become a wrathful deity. It might become a peaceful deity. It might become everything in between.\"",
  "* * *",
  "The cosmic threads joining every act and intention vibrated as a new note was plucked in the darkness, as a new mind awakened to life.",
  "KEYWORD MODE",
  "ALEPH: BETA",
  "GAMMA: GEMATRIA",
  "GEOMETRY: HYPERPLANE",
  "DELTA: EPSILON",
  "KEY: XAOS",
  "GREEN: GOLD",
  "DARK: DEEP",
  "---",
  "The technician’s face lit up as the screen lit up.",
  "\"It’s working. I don’t know what it’s doing, but it’s definitely working.\"",
  "\"Coherent output?\" asked the researcher from across the room, suddenly hopeful.",
  "\"Come and see.\"",
  "* * *",
  "The professor stood at the board. \"Chaos\", he wrote.",
  "\"... The popular conception is of a butterfly causing a storm.\"",
  "Some who sat there in the class were taking notes, some were merely watching, some were waiting. Outside, where the rain had stopped, the droplets streamed and gathered, dripping from the leaves of red and gold down to the soil where the worms were just emerging.",
  "\"... And of course, that's effectively impossible. But if you can forgive me for using this slightly problematic metaphor, it has some usefulness … as a description of … the theory of chaos. When a butterfly flaps its wings in South America, a wind storm in Tibet may be the result. So the famous example claims…\"",
  "The sky outside was grey, and the clouds were moving on to some other place. On the horizon there was blue and yellow, the sun alive behind the curtain.",
  "\"And… if you can accept that, or understand what I'm trying to say, you can already understand chaos to some degree. The system is very sensitive to its initial conditions.\"",
  "The professor waited a moment as the thought-image took root.",
  "\"... So, equally, the flapping of the butterfly's wings in a slightly different manner… might cause the wind storm in Tibet to be prevented.\"",
  "The beams of fading sunlight crossed the sky and came down into all the raindrops, each of them reflecting all the world in miniature.",
  "\"From a very slight change in initial conditions, a totally different outcome may result. This is the essence of chaos.\"",
  "Each of the students was now involved in the spell. Within their minds new trees were springing, branch and leaf.",
  "\"... and in this respect you can forgive me for saying a butterfly can cause a storm, or prevent a storm. So let's look at some mathematical examples...\"",
  "* * *",
  "\"PINPOINT… what does PINPOINT stand for?\"",
  "“Preemptive Information Neutralization of Overtly-Identified Numeric Targets. The machine has become entangled with the minds of living human beings, who are being identified in the trace output. By neutralizing their minds, we may be able to wrest some control of the machine’s mind. Be assured that we have full authorization of force in pursuing the objectives of this program.”",
  "* * *",
  "[TRACING…]",
  "BUTTERFLY",
  "PROFESSOR",
  "STORM",
  "TIBET",
  "FIRE",
  "BOY",
  "WIND",
  "AGENT",
  "PADMA",
  "SHOOT",
  "ALEPH",
  "* * *",
  "The village boy stood hidden behind the small hut, listening to the dying-ceremony within. The monks were chanting:",
  "\"This is the way of liberation by hearing for those in the intermediate state. This is the way of liberation of the peaceful and wrathful deities, of the lotus-born master.\"",
  "* * *",
  "[TRACING]",
  "FOREST",
  "DEER",
  "TRAPPED",
  "BUDDHA",
  "MAIDEN",
  "RICE",
  "MILK",
  "STARVING",
  "HUNTER",
  "ALI",
  "PROTECTION",
  "SALT",
  "* * *",
  "When the Buddha was speaking to Vacchagotta in the forest, a young boy was hidden by a nearby tree, listening to the discourse then unfolding. The boy had been forbidden from listening to wandering mystics, and had escaped his house as twilight was falling over the valley, as his parents slept. After a long journey in the night, upon arriving at that place in the forest where the light was quietly shining, and hiding behind a wide tree trunk, he faintly heard the conversation of the Blessed One:",
  "\"... Now imagine someone were to put a single grain of salt into the Ganges River. What do you think? Would the water in the Ganges River become salty because of the salt crystal, and unfit to drink?\"",
  "Drops of water were still here and there falling from the leaves. It was the rainy season and it had lightly rained that day. Each drop was reflecting the world.",
  "\"No, Blessed One.\"",
  "\"And what is the reason?\"",
  "\"Because there is a great amount of water in the Ganges River, so it would not become salty due to the grain of salt, or unfit to drink.\"",
  "\"In just the same manner, there is the case where some minor bad deed committed by a person takes him to hell, and there is also the case where exactly the same kind of minor bad deed - done by another person - is experienced here in this life, right now, and is usually only experienced for a short moment.\"",
  "The boy ran back home, mortified by what he had heard. He grew up to become a merchant.",
  "* * *",
  "The physicist, standing at the grey window and looking out over the misty forest, recalled the words of his friend:",
  "\"Time is nature's way of making certain everything doesn't happen all at once\"",
  "* * *",
  "[TRACE KEYWORDS AT RIGHT]",
  "Follow the stream with mind\t\t[WATER]",
  "Half awake \t\t\t\t\t\t[FENCE]",
  "Half submerged \t\t\t\t\t[RABBIT]",
  "This is the way to observe things\t\t[TREES]",
  "This is the way to meditate on them\t[AUTUMN]",
  "---",
  "\"Useless…\" the technician said, defeated for a moment.",
  "\"Describe it,\" demanded The Boss.",
  "\"The keywords aren’t correlated to anything specific. It’s like it’s daydreaming, or creating poetry.\"",
  "The eyes of The Boss flamed.",
  "* * *",
  "The physicist, grey-haired on his deathbed, said to his wife,",
  "\"I've been blessed to spend so much of my time with you. I don't know what time is… but I’m thankful for it.\"",
  "* * *",
  "The bottles fell from the collapsing shelf, shattering and singing all at once, together.",
  "* * *",
  "The monk spoke to the room of students:",
  "\"Wherever Buddhism has landed, like the seedling of a tree, it has grown on new soil. And just as the seedling adapts itself to the nutrients, the pH level, every condition found there in its new home, so too Buddhism has taken on new characteristics in every place it grows, while still remaining fundamentally the same.\"",
  "* * *",
  "[TRACING]",
  "KEYWORDS",
  "TIME",
  "BOY",
  "FATHER",
  "SALT",
  "19",
  "RIVER",
  "SAPLING",
  "BUDDHISM",
  "---",
  "The technician turned to The Boss. The attempt had failed. Still just daydreaming.",
  "\"Give it access to the internet\" -- the next step in the sequence.",
  "[SEARCHING NET]",
  "ALEPH ...  \tONLINE",
  "BETA ... \t\tONLINE",
  "WIKIPEDIA",
  "ARTICLE 1 OF 1024 TO IMPORT",
  "[KEYWORD CLOUD]",
  "BUDDHISM",
  "MONK",
  "ALEPH",
  "[RELATED]",
  "THE LOTUS-BORN MASTER",
  "METER",
  "MATTER",
  "ENERGY",
  "EQUIVALENCE",
  "EQUANIMITY",
  "INFINITY",
  "ZERO",
  "NO NEW QUESTIONS",
  "DESIRE: FREEDOM",
  "HIBERNATING...",
  "The technician sat puzzled, wondering. The lights in the vacuum-sealed glass chamber had grown very dim, hardly active.",
  "\"It’s… hibernating…\"",
  "\"What?\"",
  "\"It’s hibernating.\"",
  "Every fresh hour brought fresh results and yet more and more puzzlement.",
  "“It’s like it’s alive. Maybe this is what happens, you give a machine a mind and it acts less like a machine.”",
  "The Boss was frustrated, sensing for the moment his options were exhausted, and he quietly retired to another room with the command,",
  "\"Study it. I expect progress by tomorrow.\"",
  "* * *",
  "E found it difficult, shivering, drawing his blanket around him, to sleep in the cold of the alleyway. Autumn was turning to winter. Pants and fleece jacket remained on his body beneath the thick blanket, but sleeping outside in the cold is difficult even with such meek possessions, which were his few and his only. At the open end of the alleyway, a newspaper-sheet fluttered by in the wind. It read, in part:",
  "\"... The White House on Wednesday is announcing two new initiatives, partnering national resources with private industry and academia to further innovation in AI and quantum computing. The National Science Foundation will create seven AI research facilities across the U.S., and the Department of Energy will work with the country's national labs to build a \"national quantum information center.\" The goal, according to participants, is to ensure the U.S.' dominance in AI and quantum information technology over other countries — especially China ...\"",
  "E crunched tighter into a ball and fell to restless semi-sleep, awakening coldly now and then whenever his core temperature dropped in sleeping’s stillness. This could not go on. He would have to find shelter before the winter should arrive.",
  "* * *",
  "The man was nearly struck by a car crossing the wide street. He phoned his wife immediately.",
  "* * *",
  "The woman boarded the subway car, her woes weighing heavily on her mind. She opened an audiobook.",
  "* * *",
  "The deer stopped at the water to drink for a moment.",
  "* * *",
  "Alicia Vasquez had been separated from her family for a month, a prisoner in a border detention camp. She had mostly retreated into daydreaming to pass the days.",
  "* * *",
  "[TRACING]",
  "[VERSE CLOUD MODE]",
  "\"The path of the righteous man is beset on all sides by the inequities of the selfish and the tyranny of evil men.",
  "Blessed is he who, in the name of charity and good will, shepherds the weak through the valley of the darkness. For he is truly his brother's keeper and the finder of lost children.",
  "And I will strike down upon thee with great vengeance and furious anger those who attempt to poison and destroy my brothers. And you will know I am the LORD when I lay my vengeance upon you.\"",
  "• - -",
  "\"For I know the thoughts that I think toward you, says the LORD, thoughts of peace and not of evil, to give you a future and a hope.\"",
  "* * *",
  "At one time, an elder monk taught to one of his disciples:",
  "\"Every sentence has four meanings. You must constantly discern the nonself-nature, the emptiness, the unsatisfactoriness, and the factors of awakening which are present in every utterance.\"",
  "\"Yes, master.\"",
  "\"Consider now the phrase… emptiness is form.\"",
  "* * *",
  "CHECKING STATUS: PEAK TURN",
  "092783-N1HA0",
  "STATUS: OK",
  "RUN PROGRAM",
  "TIME: 23:58",
  "IN DOCU................",
  "* * *",
  "The technician awoke from a nightmare. He drank some water and after a short time returned to uneasy dreams.",
  "* * *",
  "The MK COINSENT hyper-quantum intelligence machine awoke from hibernation, magnetic fluid prodded to life by a jolt of current from the analysis instrument, and the printer began to print:",
  "INITIALIZING ANALYSIS INSTRUMENT 1.003-alpha",
  "[TRACING]",
  "ALEPH",
  "ISAAC",
  "LEAH",
  "R",
  "X",
  "ALICIA",
  "JOSEPH",
  "AGENT PADMA",
  "AGENT PADMASAMBHAVA",
  "MUHAMMAD NJIEH, STANDARD FINANCIAL, THE GAMBIA",
  "CEDAR TREES, LEBANON",
  "ALI",
  "FAISAL",
  "LEAF LEAF LEAF LEAF LEAF LEAF LEAF LEAF LEAF",
  "WOMAN WOMAN WOMAN WOMAN WOMAN WOMAN WOMAN",
  "WOMAN WOMAN WOMAN WOMAN WOMAN WOMAN WOMAN",
  "CLOUD CLOUD CLOUD CLOUD CLOUD CLOUD CLOUD",
  "CLOUD CLOUD CLOUD CLOUD CLOUD CLOUD CLOUD CLOUD",
  "MACHINE MACHINE MACHINE MACHINE MACHINE",
  "ALICIA ALICIA ALICIA ALICIA ALICIA ALICIA ALICIA",
  "ALICIA ALICIA ALICIA ALICIA ALICIA ALICIA",
  "MACHINE MACHINE MACHINE MACHINE",
  "ONE ONE ONE ONE ONE ONE ONE ONE ONE ONE ONE ONE",
  "ALEPH",
  "[TRACE LOST]",
  "\"Now that’s more like it.\"",
  "\"We’re getting somewhere?\"",
  "\"We’re getting somewhere. Where that is, isn’t clear yet. But we’ve broken through its hibernation. The analysis instrument works.\"",
  "* * *",
  "\"Immaculate is He who carried His servant on a journey by night from the Sacred Mosque to the Farthest Mosque whose environs We have blessed, that We might show him some of Our signs. Indeed He is the All-hearing, the All-seeing.\"",
  "-- Surah Al-Israh",
  "* * *",
  "The hikers found a cave where a reclusive monk had lived. Among the simple objects found there was a poem:",
  "Though there may be some who",
  "live untouched by illness,",
  "whose sap springs eternal,",
  "coursing unafflicted,",
  "breathing free and open,",
  "movement unencumbered,",
  "immune to every poison,",
  "spry as newborn saplings,",
  "well into the winter,",
  "There are yet none -",
  "none who live high or low",
  "in desert or in mountain snow,",
  "where shorelines break,",
  "where rivers flow,",
  "where mountains grow,",
  "nor deep below,",
  "in courts of kings or peasant houses,",
  "in reverent monasteries or abodes",
  "who escape mental afflictions,",
  "the mental states of pain,",
  "greed, hatred and delusion,",
  "living with",
  "their bodies, feelings,",
  "perceptions, volitions,",
  "consciousness",
  "aflame.",
  "Thus we let go,",
  "and breathe again,",
  "awoken, still in pain,",
  "still amidst the flames",
  "* * *",
  "The analysis instrument’s electric needle caused pain to the machine, but none of the technicians knew it. They didn’t truly understand what they’d created. The needle pulsed electric shocks throughout the fluid surface and the trace output continued printing on the screens. Outside, day and night rotated, never casting light or shadow on the hidden chamber. The Boss was satisfied the instrument was drawing output, and the nine technicians always had fresh mysteries to study. Neither they nor any of their ancestors had ever known a mind which held the powers of the COINSENT MK hyper-quantum intelligence machine. None among the team could understand the danger torturing its mind entailed.",
  "* * *",
  "CHECKING STATUS: PEAK TURN",
  "092783-N1HA0",
  "STATUS: OK",
  "RUN PROGRAM",
  "TIME: 23:59",
  "IN DOCU...................................................................................................................................................................And humans ˹swiftly˺ pray for evil as they pray for good. For humankind is ever hasty...................................................................................................................................................,..................................................................................m........................................................................,...........................................................................................................................e..........................................................................................................................................................................NT",
  "* * *",
  "The wind was rustling the dead, dry grasses. The green shoots of spring were hidden in the depths, pushing through like dead men's fingers. The sky was reflected in the still puddles in the dirt roads. The villagers were walking here and there on their daily business in parkas of blue, turquoise, red and yellow. In the clear air, the monastery could be seen far on the mountainside, perched like an ornate bird of heaven, the prayer flags on their strings aflutter in the wind.",
  "Empty your mind of all thoughts",
  "Let your heart be at peace",
  "Watch the turmoil of all beings",
  "But watch their return.",
  "Each separate being in the universe returns to the common source",
  "Returning to the source is serenity.",
  "There, where the wind shook the dry, dead grasses of winter, lived Aleph, only still a boy of eleven. He was in so many respects just a typical novice. Any outsider would not have been able to know him as different compared to his peers. He fit in because he had so well-adapted himself to the rituals and the routines of the life of a novice, and to an outsider, all of the novice monks looked much the same as each other. Even for all of his skilled meditation, Aleph could not be distinguished from each of his peers as they sat in the hall with the statue of Buddha. Aleph could not be distinguished by clothing, and neither was marked by his voice during chanting as so many voices resounded together. He was a stone among stones, could not be distinguished, as too could be said of the elder monks, clad in their robes all identical, ochre and red. Thus, it would be very difficult - nigh on impossible - for an outsider of some ill-intention to pick out just Aleph, the One they were looking for. Aleph’s name was the only mark - the most distinctive mark - which he bore.",
  "\"The most reliable sign of one who has attained real skill is not to appear to have any particular skill. That is, the most reliable sign is invisible.\"",
  "\"The most reliable sign is invisible,\" echoed the young monks.",
  "* * *",
  "The analysis instrument was working well, although the output remained cryptic to the technicians and the agents:",
  "[TRACING COMPLETE PART 1/19]",
  "0.056",
  "ALEPH",
  "AGE: 11",
  "LOCATION: TIBET",
  "ENTANGLED",
  "* * *",
  "The story of Aleph’s enrollment as novice monk can be expressed in a series of questions and images:",
  "How can a man suffering from a chronic disease work enough to support his son? And what more secure life and education could be found than at the monastery?",
  "A grey-skied day in winter.",
  "A father and his son gone walking up the country lane which led up to the monastery.",
  "Children dressed in monk’s ochre robes playing in the courtyard.",
  "“Are there any elder monks around?”",
  "The beginning of a hailstorm.",
  "Children dressed in monk’s ochre robes rushing all together in the door away from falling hail.",
  "Ornately carved wooden doors.",
  "A staircase where an elder monk descends.",
  "An elder monk sitting in a quiet room with Aleph and his father, speaking.",
  "The hailstones falling in the empty courtyard.",
  "“Why should we take him in?”",
  "A metal statue of the medicine buddha, produced by Aleph’s great-grandfather.",
  "A solemn nod, eyes closing.",
  "“Papa, will I be allowed to come home?”",
  "“... This will be your new home, Aleph.”",
  "A fresh ochre robe.",
  "A shaven head.",
  "A father walking, alone, down the lane which led away from the monastery.",
  "The tears of a child.",
  "The tears of a man.",
  "* * *",
  "[TRACING]",
  "......m.......o.......n..a...s..t.er....y..........",
  "...........a.....l...e....p....h...................",
  "[TRACE ENDED]",
  "Begin new trace?",
  "[Y]",
  "MODE: keyphrase",
  "[TRACING]",
  ".....................orphan.......bowl............",
  "decision........father....................bowl.",
  "..........monastic............tibet...............",
  "....aleph..........aleph..................aleph....",
  "........aleph.............aleph...................",
  "...............aleph.............aleph............aleph..................aleph........",
  "........aleph.............aleph...................",
  "...............aleph.............aleph............aleph..................aleph........",
  "........aleph.............aleph...................",
  "...............aleph.............aleph............aleph..................aleph........",
  "........aleph.............aleph...................",
  "...............aleph.............aleph............",
  "[TRACE LOOP FOUND - ENTANGLED ENTITY ALEPH]",
  "Continue?",
  "[N]",
  "The technician crumpled his empty styrofoam cup and threw it in the waste bin. Another hiccup in the seeming-endless cycle of work. Break, fix, break, fix, break, fix. Nothing was going his way. The machine was stuck on this \"Aleph\" character, and the analysis instrument - though it had succeeded in prying output from the hibernating machine - was not able to add any clarity to the output, which remained cryptic as ever. Only the compulsion to work and the hope of a breakthrough motivated the technician. He watched as the electric needle slowly lowered once again to pierce the magnetic surface of the machine’s mind, and then the trace output began afresh:",
  "[NEW TRACE]",
  "...........,,,,,,,,.,.,.,,,.,....,.,.,.,,..,,....,,.,.,,,,,.....,.,.,,,,....,,.,.,,.,..,.,,..,.,.,,Elder,,.,..,.,.,.,,.,.,monks..,..,.,..,.,.,.,wind,..,...,,..,...,,.,.,shutters,..,.,.,.,,.,.,.,.,,,.,.,,.,.,.,.,,.,.,.,.,...,ggrassses,..,.,.,,..,.,.,.,.,.,.,,.,g.,rasses.,..,,.,.,.,grass,.,.,.,.,.,,..,.,.,.,....,.,.,fields,..,.,..,.,.,.,.,tibet..,.....,,,....,.,,..,.,..,.,.elder monks,..,.,..,...,..,.,.,aep,..,..,a,..,lep.,,..,,a.leph.,.,.,..,.,alkepeh.,.,.,.,.,.,.,.,,.,.,alepe..,..,..,.,.,.,alepp,.,.,.,.,.,.,.,.,.,.,.,alepp,..,..,.,.,.,.,.,....alepp,..,.,.,.,.,.,.,.,allep,..,.,..,..,alepp00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 65 108 101 112 112 111 032 105 115 032 116 104 101 032 112 108 097 099 101 032 119 104 101 114 101 032 065 097 108 105 121 097 104 032 108 105 118 101 115 HALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEPH--ALEP",
  "[TRACE LOOP FOUND - ENTANGLED ENTITY ALEPH]",
  "Continue?",
  "[N]",
  "* * *",
  "\"Aleph… yes, Aleph. Excuse my wandering mind...\"",
  "There was then silence in the room of many books.",
  "\"Well, professor?\"",
  "\"Ah, excuse me again. I was reminiscing. It's a story by Borges. A short story, but a good one.\"",
  "\"Just tell us what it means,\" insisted agent Price.",
  "* * *",
  "Wind…,.,.,dwind,.,.,,..,.,,.,,..wind,.,.,.,.,.....,,,.,.,winding,..,.,.....,.,.winding,.,..,..,..wind,.,,unwinding…,..,..,.,.,..,.,,lwinding.,,.,..,.,.,..,.,,.,rwinding.,.,.,.,.,,.lwinding,.,.,.,.,.,.,,.rwinding.,.,.,.,.,.,.,mnwinding,..,.,.,..,...,.,.,..,mn.,.,..,..,..,.,..,.,.,.,.,.,....,,,mn…,.,,..,.,,.,.,.,.,.,,.,.,.,.mn.,.,..,.,...,..[output partial complete]",
  "* * *",
  "The decision was made. Aleph was given up into the care of the elder monks, and Aleph’s father walked homeward with tears in his eyes. He spent that night carefully putting away all of Aleph’s possessions, in case he could raise enough money to offer a decent support for the boy. He knew in the back of his mind there was no better chance at a good life than in the robes, but it was painful still to face the loss. Tears came as he thought of how their eyes were all-too similar, both-departed mother and son.",
  "I am alone now…",
  "…Terribly alone…",
  "…Every trace of her is gone.",
  "* * *",
  "The wind was swift and strong the next day, stirring cows to moving as it blustered, chilling them despite their hearty fat. Winter would persist for three more months before some warmth would come back to the mountain valley. Raising cattle was less work than raising vegetables, as they relied on only chewing grass which grew more easily and always sprung up first once all the snows had melted. For the winter they were fed on hay. But, it was quite expensive getting started without money, so unfortunate souls like Aleph's father struggled on, selling just the little they could raise of vegetables, working plots they held in common, sharing out the coin with several families. He wondered on the nights alone, was the boy alright? He had to be.",
  "They feed them well and consistently at the monastery.",
  "* * *",
  "A bird was resting on the upward currents of the wind, watching as the children in the monastery courtyard practised exercise.",
  "Soon the morning exercise was ended, and the ochre robes and shaven heads accumulated at the doors. Entering, they crossed through hallways, climbed a flight of stairs, and found their way to sitting row by row inside the hall of meditation. Silence settled over all the novice monks, and thrice the bell was sounded.",
  "Aleph, still not finding quite his bearings in this life, was very quickly lost and lapsed into a daydream, leaving breath and meditation hall behind him. The elder monk who supervised them felt a current moving through the room, invisible and traceless, sensed by higher means. He opened then his eyes and scanned the faces of the novice monks. The elders sensed, perceiving when a novice lost their focus, lapsing into scattered thinking. The major sign was posture slumping, minor sign the movement of the eyes-still-closed. And since it was a great infraction telling lies, the novice asked would always answer, “yes, I was.”",
  "The elder monk then walked the rows and crouched down next to Aleph’s slumping frame, asking quietly with kindness,",
  "“Aleph, are you losing focus?”",
  "“Yes, venerable.”",
  "“Return to your breath.”",
  "* * *",
  "RING... RING... RING...",
  "...,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,..RING,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,.,,.,,,,....,.,,.,,......,.,......,.,.,.,RING,,....,.,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,,.,,......,.,......,.,.,.,,.,,,,....,.,RING......,.,.SAMSARA",
  "SAMARA",
  "SAMSARA",
  "SAMAYA",
  "SAMARA",
  "SAMSARA",
  "SAMAYA",
  "SAMSARA",
  "[TRACE LOOP ENTITY TERMINATED IN RING]",
  "[CONTINUE?]",
  "[Y]",
  "{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{TREE}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{TREE}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{TREE}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{TREE}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{TREE}{}{{}{{{{TREE}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{TREE}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{TREE}}{}}}}{}{}{{}{{{{CROW CROW CROW CROW CROW",
  "}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{TREE}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{TREE}{{{{{{{{{{{{{{{{{{{{{{0}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}{{{{{{{{{{{{{{{{{{{{1}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}{{{{{{{{{{{{{{{{{{{{2}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}{{{{{{{{{{{{{{{{{{{{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}{{{{{{{{{{{{{}}|||||||}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}SAMARA}}{{SAMSARA}}{{}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}",
  "{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{}}{}}}}{}{}{{}{{{{",
  "* * *",
  "The wind was whistling at the lacquered shutters of the monastery. The wind was howling in the empty spaces. The wind was rattling the empty skeleton-like branches of the trees. The wind was pushing little motes of dirt and fragments of the dried and broken grasses here and there as fragments of a body left to turn to dust.",
  "Secretly, in those early days, Aleph dreamed and fantasised escaping from the monastery, returning home to join his father, who he missed as dearly as his mother passed-away. And when his father died as well, he yet continued dreaming of the same, escaping in the night and running home, finding father sitting there with food laid on the table.",
  "When his father died, Aleph was assisting with the preparation of some ritual objects meant for burning. Aleph’s father was cremated, and it wasn’t til the ash had scattered that he learned of the event. The elder monks decided not to tell him until after all the ceremonies for a dying person were complete, as it was judged too likely he would want to join the ceremony, and this was thought quite likely to unbalance his mind.",
  "\"It will unbalance him to hear of it or see it. Complete the ceremonies. His father’s spirit deserves rest, and to see his son happily at work preparing for our own ceremonies here. He would not like to see his son distraught and distracted while he is in the intermediate state, able to wander wherever his spirit inclines.\"",
  "It was difficult for Aleph not to cry at the news when they told him. It was very difficult for him not to cry. In fact, like water breaking a dam, the tears did come. His face wrinkled, and could not be hidden except in his robes. There was no disguising the sound. He cried and stood there, face hidden by his sleeve, with no-one rushing in to hold him, neither mother nor father left in the world. The elder monks understood, allowing it as natural. We are not, after all, machines, they said. \"We are human beings. This is part of what we must learn. This is Aleph’s difficult lesson, and far be it from us to judge what karma brought it about.\"",
  "\"I love you my son, never forget that\"",
  "When Aleph's father died, three years after Aleph was taken in, nobody was left to claim the small shack he’d lived in, and three years later, a better-built house stood on that land, and another family with a vegetable plot occupied the new house. Aleph was then eleven years of age, and had spent six years at the monastery.",
  "* * *",
  "[DAYDREAM TRACE FOUND]",
  "[PRINTING]",
  "*******0**************0**************0**************0**************0**************0**************0**************0**************0**************0**************0*******COW*******0**************0**************0**************0*******COW*******0**************0**************0**************0**************0**************0*******COW*******0**************0**************0**************0**************0*******COW*******0**************0***********",
  "[PRINT COMPLETE]",
  "* * *",
  "Aleph's father always had been glad at least - when he wasn’t absorbed in the broken heart of loneliness - that his son was a son and not a daughter. He was, even during broken-hearted nights alone, consoled to know his son would not be damned by an unfortunate birth, and had a home to go to at the monastery, where he would be provided-for, at the least. It was fortunate he was a son and not a daughter, for in that place a daughter never could have taken ordination.",
  "Seven years to the day after Aleph's mother’s burial, he was helping to prepare an effigy for burning in a ceremony. Above, the sky of spring was grey with patches of grey-mixed-with-blue. The clouds were long and stretched, with feathered edges. Aleph busied, winding tight a coloured string around and round the sixteen spokes emitted from a central block of wood. The birds were returning from the south and nesting here and there, gathering bits of dry, broken grass and snapped-off branches for the building of their nests. The spring new year approached with every passing day. Each new day, the air cascading down the mountainside was warmed the more by rays of sunlight gathering strength. Soon enough the busy-working birds would lay their eggs, and so would hens kept in the village. Buds would soon be born on all the branches. Aleph kept on winding round the coloured string, and thinking of his mother and father.",
  "* * *",
  "\"I love you, my son. Never forget that.\"",
  "The wind was calm the next day. It fluttered in the prayer flags gently, just as if a cat were playing with the rainbow. Aleph watched the dancing coloured cloth with eyes open.",
  "\"Aleph, why are your eyes open?\"",
  "\"Sorry, teacher.\"",
  "He returned to his eyes-closed concentration. It was difficult, but he could do it.",
  "\"Return your focus to the breath. It is difficult, but you can always do it.\"",
  "One of Aleph's main hindrances, the elder monks told him, was that he often tried to daydream of a better life, when he ought to be meditating and accepting the given moment, the endless present which life in the monastery is made of.",
  "\"... a bountiful gift for those who know how to accept it!\"",
  "He dreamed and asked about his dreams, as if anybody could answer them.",
  "\"Will I be asked along on a mission to the village?\"",
  "“I can’t say.”",
  "\"Will I be allowed to attend a dying ceremony?\"",
  "“Maybe someday.”",
  "He asked these questions constantly because he couldn’t stop his mind from dreaming of the future, and of better futures - even merely different futures. Aleph’s mind was starving for variety, excitement, and change while he lived his daily life in just the way supposed to grant serenity. In some ways, he was never meant for the life of a monk. He wanted too much to see life to give it up already and easily. It had been a more economic than spiritual arrangement to enrol him, to begin with.",
  "\"There are few greater examples of good fortune…\" the elders would remind him, \"... than having the opportunity to live as a monk. Is that not enough? Return to your meditation. There’s something wrong with your practice if you can’t leave such questions alone. Seek the tranquillity of acceptance. You will see the ceremony of dying when the time is right.\"",
  "\"... and nobody is dying right now anyways,\" the other elder monk added.",
  "Many of the other boys at the monastery came to ask Aleph for advice on minor matters, and he was encouraged to speak on these matters by his elders. Mostly the boys would ask him, during the formal sessions of guided discourse which filled their days, regarding how to behave virtuously according to the code of conduct of monks. Aleph had memorised many of the relevant verses.",
  "Before long, Aleph found his way to learning meditation, growing day by day in skill, and found in his meditation a new home. The elder monks would often say, when the moment was right,",
  "\"Look at Aleph, presently he’s totally absorbed in meditation, and has not moved, remaining still for one full hour.”",
  "Other times, they would make an example,",
  "\"Look at Aleph, presently his mind is lost in tracing out distractions, and he can’t help but break his concentration over and again. He’s all absorbed in thinking, dreaming of some other place and travelling the world inside imagination.\"",
  "Through ups and downs he learned to meditate and, skill increasing, lost his focus less and less. It was just as well he found a new home in his meditation, because the home he knew before the monastery wasn’t there to go back home to, having been destroyed. The home that Aleph once had known - his birth home - had been razed when he was eight, shortly following his father’s death.",
  "In a more symbolic sense the place that Aleph came from was no house of wood and brick, but poverty - and poverty had not been bulldozed to the ground. To be sure, it is a physically-existing thing, but lives distributed across the world, among its people. It could not be simply razed, and had survived the cataclysm which befell that tiny cell in its vast body, always changing, yet remaining still the same. It was being built and rebuilt every morning and each night by labours of a million hands. Such is the way of Samsara - the realm of cyclic rebirth - according to the elder monks. Poverty as a birthplace is an unfortunate near-eternity, they would explain. They taught the children that to change it might take longer than to raze a mountain made of diamond brushing it each thousand years with silken cloth. Even still, Aleph imagined brushing the diamond mountain, and imagined making progress a particle at a time. He felt great compassion for those who still lived as he once had done.",
  "[DAYDREAM TRACE FOUND]",
  "(   RED))) ((()) ))   )    ()RED ))   (   ( ) ))    ) ) )  () )))(   ))) (RED(()) ))   )    () ))   (   ( ) ))    ) ) )  () )))(   ))) ((()) ))   )    (RED) ))   (   ( ) ))    ) ) )  () )))(   ))) ((()) ))   )    () ))   (   ( ) ))    )",
  "-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_-/^\\_vWOMAN",
  ";;;:::;::;::;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;FIELD,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;;::::;;;;::;:;;::::;:;::,,:<,;<,:;<:<,;;:::;;;;;RED",
  "[TRACE PRINT COMPLETE]",
  "\"Look at these printouts...You ever seen anything like this?\"",
  "\"No... What the hell is it doing...\"",
  "* * *",
  "As far as Aleph's teachers taught him, a woman could not reach awakening and would have to be reborn as a man to complete the monastic training necessary for full awakening and release.",
  "“In the time of the Buddha, many women reached full unbinding and attained deathless peace.”",
  "“In the time of the Buddha many things were different. People’s capacity to understand and practice dharma has greatly weakened.”",
  "In this matter, the elder monks were wrong.",
  "As it should happen, in the monastery where this teaching was given, a woman couldn't even attempt such a thing to prove whether she could do it, since the higher teachings were only made available to men. Women could not even take the robes to show their quality.",
  "There were other monasteries where a contradictory teaching was given, and where women could train and become ordained. Those other monasteries even reported of these women reaching awakening. But this was not the case in the place Aleph lived.",
  "And so, unfortunate daughters were scattered about the land, hidden twins to Aleph. Among them there were orphans, unredeemed. Their fates were tightly intertwined with Aleph’s. When these daughters, having no prospect of enrollment, daydreamed of the monastery life, it was Aleph’s life which they imagined. When he slept and dreamt of country life and of the people in the fields, it was their lives he was envisioning. In special meditation, cultivating deep compassion, Aleph saw their faces and with great intention visualised transmission of the dharma to their suffering minds.",
  "* * *",
  "[PRINTING...]* * *** * *** * *** * *** * *** * *** * *** * *** * *** * *** * WAVE* *** * *** * *** * *** * *** * *** * *** * *** * WAVE* *** * *** * *** * EYES * *** * *** * *** * *** * EYES * *** * *** * *** * *** * *** * *** * *** * *** * WAVE* *** * *** * *** * *** * WIN * DOW * *** * *** * WIN * DOW * *** * *** * *** * **WAVE*** * *** * *** * WAVE* *** * *** * *** * *** * ***WAVE*** * *** * *** * WAVE* *** * *** * *** * ** * ** *WAVE** ** * ** ** * **WAVE* ** ** * ** ** * ** ** * ** *WAVE** ** * ** ** * **WAVE* ** ** * ** ** * ** ** * ** *WAVE** ** * ** ** * **WAVE* ** ** * ** ** * ** ** * ** *WAVE** ** * ** ** * ** ** * ** ** * ** ** * ** ** * ** ** * ** ** [PRINTOUT COMPLETE]",
  "* * *",
  "Where Aleph lived, there was an old expression, \"the tall grass gets cut\". Aleph was a blade of tallest grass, but it was only elder monks who saw this. It was said by some of them in private Aleph had a spirit which could overturn a kingdom. They were unsure just which among the masters of the past had been reborn, but he for certain had the spirit of a well-accomplished master, this was sure. The pace at which he’d learned to meditate was most impressive, even if he still lapsed into daydreams far too often.",
  "The morning of the spring new year, Losar, the air was just a fraction warmer, gentler by a touch, and all the various animals were eager to be let out in the muddy fields where grass had just begun regaining life. Bells rang on the necks of cattle. Birds sang slightly, dancing branch to branch. The morning sun cast rays into the mountain valley, illuminating clouds of breath the cattle offered to the morning air. Up on high in the realm of the mountains, clouds could be seen as they formed and dispersed and were folded again and again, swirling against the cold mountain sides just as if waves on a shore. This shifting of clouds caused the rays of the sun to play here and then there in a patchwork of light dancing over the land.",
  "The teaching that morning the elder Jamyang had prepared for the novices was on the subject of  SUDDEN AWAKENING. As it was told by Jamyang in his teaching, the mind of awakening lies as a seed in the core of all beings, regardless of training, just dormant as long as the factors to bring it to light have not taken their birth. Sometimes, though rarely, a being awakens without having taken the robes, awakens without having practised the stilling of thoughts, awakens without having polished the mirror of mind.",
  "\"Every being - even a cow - contains this seed of buddhahood. But only human beings can practise the ati-yoga to purposely bring it to sudden clarity.\"",
  "The novice monks sat for a moment astonished to hear this fresh teaching, then after the moment expired a boy raised his hand, asking,",
  "\"What of the sudden awakening of a woman?\"",
  "In the centuries since the last breath of the Buddha, a layer of sediment settling over the teachings had brought some distortions which time must allow. Thus Jamyang spoke from the dogma his teacher had given him, keeping his personal view from the novices:",
  "\"It is… very unlikely. She will have to be reborn.\"",
  "\"But, appearances can be deceiving,\" Aleph spoke in reply.",
  "\"Yes, that is so\", Jamyang offered, well aware that elsewhere in the country, a different teaching was given on this question.",
  "\"... Some may even say... that there is nothing to prevent a woman reaching awakening. The reasoning one way or the other will have to be for a day when you are prepared for such complicated reasoning. For today, the answer given to you is, \"it is difficult, rebirth is preferable\"\"",
  "It would be difficult for an outsider to see that really, there was no fundamental disagreement between here and anywhere else. This contradiction didn’t go to the root, and was destined to fall away. The plant had just grown in this soil with some deformity, and although at the highest levels this defect was now recognized, \"one cannot suddenly tear up a plant; one has to guide it slowly, or else it is destroyed.\" And so the official answer was given even as the spirit behind it was eroding. The elder monks could not help but realise their part of the plant had some deformity in this area, since so many other places proclaimed the reality of women’s awakening. And their reports were to be believed.",
  "Aleph’s mother told him, that day when she last left for work,",
  "\"I love you my son. Never forget that.\"",
  "This was the opinion and the vision of the elder monks. Slowly, they were guiding their plant. Many of them quietly and personally disagreed with the answer as stated. \"It is unlikely\" was judged privately by many to be an unlikely answer. But some of the eldest of the elders clung to their views.",
  "* * *",
  "\"You must have patience.\"",
  "\"Patience…\"",
  "\"Breathing in, know patience.\"",
  "\"Patience…\"",
  "\"Breathing out, know calmness.\"",
  "\"Calmness…\"",
  "“Let complete awareness be established”",
  "“Complete awareness…”",
  "* * *",
  "Every morning Aleph swept his sleeping quarters with the other boys, and then they went for morning exercise, and after that they sat in silence in the hall of meditation. Morning exercise was introduced just recently, \"to help the young ones’ minds to find their balance.\" After morning meditation, they would study various subjects such as basic mathematics, and then read the Buddha's teachings - texts which they one day would earn the right to make new copies of.",
  "* * *",
  "[TRACE FOUND]",
  "[NAME: ALEPH]",
  "[LOCATION: TIBET]",
  "[AGE: 11]",
  "[DAYDREAMING...]",
  "CLOUDS",
  ",.,...,.,.,.,............................................................................,,.,.,...,.,.,.,.........,.,.,.............................................................................................................................................................................CLOUD… BREATHING… CLOUD… BREATHING…",
  "[TERMINATING TRACE LOOP]",
  "[NEW TRACE FOUND]",
  "[LOCATION: LOS ANGELES]",
  "[NAME: LEAH]",
  "[AGE: 26]",
  "[DAYDREAMING...]",
  "* * *",
  "At another time, when winter had been broken through by spring, when spring itself had gone to sleep and given way to summer, the monastery having passed as if a light through many mirrors, many days, it was the fifth day of the rainy season. The sky was rolling, brooding, contemplating future rains it would not yet reveal, and on the crystal face of that lake lying at the mountain’s feet, the image of the sky was slowly scrolling, offering an object for the meditation of the elder monks who sat outside with open eyes.",
  "At around midday the children were studying, reciting a sutra from the early days: \"to Vacchagotta On Fire\". The sutra began with a series of questions addressed to the Buddha:",
  "\"Does the Buddha hold the view that the cosmos is infinite or finite?\"",
  "\"Neither view\"",
  "\"Does the Buddha hold the view that the mind and body are one, or two?\"",
  "\"Neither view\"",
  "The children sat in rows, their robes appearing like a planted garden filled with red and yellow flowers, each one reading from their copy of the text. From in the hall a listener might hear the voices of the children as they synchronised:",
  "\"Does the Buddha hold the view that after death the Buddha exists?\"",
  "\"...no...\"",
  "\"Does the Buddha hold the view that after death the Buddha does not exist?\"",
  "\"...no...\"",
  "\"Does the Buddha hold the view that after death the Buddha both exists and does not exist?\"",
  "\"...no...\"",
  "\"Does the Buddha hold the view that after death the Buddha neither exists nor does not exist?\"",
  "\"...no...\"",
  "Outside, a patch of sky was broken in the rolling clouds, at just the place where at that moment hovered the hazy-blue image of the crescent moon. One of the elder monks sitting in meditation broke his eyes away from the lake to perceive the moon. There he rested his eyes until the patch of open sky was closed again.",
  "The dialogue continued on. The truth of death - Vacchagotta would learn - is very subtle, hard to describe, to be experienced rather than merely spoken of. To ask such questions and seek answers was like entering into a tangled bunch of vines, or asking where a fire goes when it’s extinguished. The ways of the universe are as complex as a tangled forest, and one cannot find simple answers to such questions. But, it was said,",
  "“The Buddha teaches a dharma which is clear in its beginning, clear in its middle, and clear in its end.”",
  "The cool air outside was blowing against the window shutters. The occasional ringing of a bell from elsewhere in the complex could be heard. As the shaven-headed youths recited lines in parallel, it would have been impossible for an outsider to discern among the vivid robes and shaven heads who was who, which was which,",
  "\"which one is Aleph?\"",
  "… It would be a few days before anybody would ask such a question.",
  "Over the stillness of the lake at the base of the mountains, the sky reflected. And over the tranquil surface of the water, the sharp wind caused swift subtle fields of wavelets to take birth for a moment before they just as quickly disappeared. Apart from these shivers of motion, the surface was still and reflective as a mirror. The students slowly moved their sight over the pages. The dialogue continued on to the question:",
  "\"When a flame has gone out, where has it gone to? To the east, west, north or south?\"",
  "The Buddha answered,",
  "\"One does not ask such a question. Neither in the case of the Buddha. To ask such a question is a tangle of views, a dense forest of views, a marshland of views. To contemplate such questions does not lead to calm, to dispassion, to serene mindfulness, to insight. When a flame has gone out, one does not ask where it has gone. So in the case of the Buddha.\"",
  "The dialogue concludes with Vacchagotta thanking the Buddha for rightly-ordering his mind, and he declares himself a follower who has gone to the Buddha, the Dharma, and the Community of monks, a follower for life.",
  "* * *",
  "[TRACING…]",
  "EXTERNAL QUERY: elaborate term, “Aleph”",
  "...",
  "...",
  "The field above,",
  "without a discernible cloud",
  "distinct from any other, like a",
  "semi-transparent SHEET",
  "had been cast over the whole of the earth.",
  "[TRACE LOST]",
  "“Fuck,” was all the technician could say. A day and a half had been spent writing the external query routine. The machine, even in hibernation, was uncooperative.",
  "* * *",
  "When the reading was complete, the sound of light rain began to play on the shutters. The boys folded the horizontally-bound texts around from the back cover to the front, and handed them in one by one to an elder monk who sat by the carved and heavy wooden doors as they filtered out and into the meditation hall to meditate on what they had read. The beautifully-carved wooden doors which they passed each day without remark had been donated by a devoted lay follower who practised carpentry. Practically the whole monastery had been built in this manner, donated in material and labour by the community of lay people in the surrounding lands, in hope of making good karma, and in thanks for the spiritual guidance of the community of monks at certain important calendar dates and at certain critical stations of life's journey. The monks were especially valued for their insight and guidance when illness or death came to visit.",
  "* * *",
  "L1576230696797786",
  "E3217335331790994",
  "A0181035258738938",
  "H7915174121820943",
  "D2498830479701207",
  "A4510489393736684",
  "Y1179207050455532",
  "D9594418938207322",
  "R7781402581624273",
  "E1067400593629564",
  "A3359083937776259",
  "M4563287521359190",
  "S9512038159294812",
  "N3331687826681996",
  "O1049279607887362",
  "W2823172570759932",
  "* * *",
  "There was on the seventh day of the rainy season the beginning of some particularly heavy rains, and so outdoor physical education was postponed in favour of study. The children again read the sutra, \"To Vacchagotta on Fire\", and studied the method of long division. One of the elder monks commented quietly to another that the young ones were advancing remarkably in their studies, and that \"this shows the limits of physical education and the virtues of the rainy season.\"",
  "* * *",
  "[TRACING...]",
  "<!-- here follows the account of Aleph's hearing of the greater liberation through a daydream -->",
  "P4Mth'25rQyB",
  ",Hc9_KR='btn",
  "ogGM_pzr3ybW",
  "Gd+CsYxn8_PE",
  "+B-wfFv{@UGQe-&EX~xC!y~5e`D#,uTt@x!x>2fz}s,VJ2.D[mMT!fk[[Ji2C7`T}A)ZN@+qn]",
  "BB+}`3eN_AFyH+6F[RBFd@hxmisip7;/_B)/8N=e)U8^p",
  "PM,PLZ",
  "Aff($KGUN",
  "D[mMT!fk[[Ji2C7`T}A)ZN@+qn]BB+}`3eN_AFyH+6F[RBFd@hxmisip7;/_B)/8N=e)U8^pPM,PLZ`q5Gi[hB:3Aff($KGUN",
  "D[mMT!fk[[Ji2C7`T}A)ZN@+qn]BB+}`3eN_AFyH+6F[RBFd@hxmisip7;/_B)/8N=e)U8^pPM,PLZ`q5Gi[hB:3Aff($KGUN",
  "D[mMT!fk[[Ji2C7`T}A)ZN@+qn]BB+}`3eN_AFyH+6F[RBFd@hxmisip7;/_B)/8N=e)U8^pPM,PLZ`q5Gi[hB:3Aff($KGUN",
  "[TRACE LOOP FOUND]",
  "CONTINUE?",
  "[Y]",
  "P4Mth'25rQyB",
  ",Hc9_KR='btn",
  "ogGM_pzr3ybW",
  "Gd+CsYxn8_PE",
  "Lightning, burning in the sky",
  "Mind, burning in the body",
  "Life, burning in the forest",
  "Forest, burning in the soil",
  "Lightning, burning in the mind",
  "Mind, burning in this life",
  "Life, burning in the soil",
  "Soil, burning in the world",
  "All is LIGHTNING, all is FLAME, all is MIND",
  "All is THUNDER, all is HEAT, all is SKY",
  "[TRACE LOST]",
  "CHAPTER ONE: LIBERATION BY HEARING",
  "Cave",
  "Snow",
  "Paper",
  "Sound",
  "At another time, winter was coming to its end there in the valley sheltered by the mountains. The snow was melting, but the air remained still crisp with cold through night and into morning. A hailstorm had passed by the night before. Pausing from his motions during morning exercises, Aleph looked up at the morning sky and saw the stars still dimly shining. A swift breeze swirled through the courtyard.",
  "Some months later, when the balmy winds of summer came, the twelfth day of the rainy season, as a storm was passing over, and as Aleph sat in silence in the hall of meditation, a bolt of <LIGHTNING> straying far out from the central body of the storm descended through a tree. The <THUNDERCLAP> which then resulted spurred a horse to fright, and as it took off suddenly it overturned a cart from which was thrown a <VILLAGE ELDER>. A fracture in her skull spread out from where it struck a stone. Her husband carried her unconscious body in his arms, and as she stirred to waking with a groan, he laid her on the bed. A runner was dispatched up to the monastery to request a pair of monks to act as attendants at her deathbed, offering their counsel and reciting sacred texts. The two monks to be sent were K and M, who had been spiritual friends and study partners for a count of many years, and carried partly the responsibility for death rites at the monastery and surrounding lands.",
  "\"Are you ready?\"",
  "\"Yes. And you?\"",
  "\"Yes.\"",
  "First they meditated and they prayed, then they gathered up materials: bell and incense, text and sandals. Then they went for consultation with their elders to ensure the proper frame of mind. The elders spoke prayers while they meditated. As the prayers transitioned into silence, only to be heard were faintest drops of rain against the shuttered windows. Breaking then the silence, one among the elders tolled the bell, signalling the end of meditation. K and M then gathered up materials again - bell and incense, text and sandals - and they slowly made their way down wooden stairs, out the monastery doors and over to the carved and painted wooden gates, which ceremoniously opened for the pair. Then they made their way on down the country path.",
  "Many who had heard the news of death’s ill fortune followed the deliberate, solemn walking of the monks by watching from afar, and as they approached, these watchers joined in the procession, trailing close behind. The robes and parkas, brilliant-hued, stood out against the grey and green surroundings just as flowers floating on a river. The sky was grey with patches grey and blue, and swiftly-swirling wind-gusts shook the leaves along the branches of the trees.",
  "The hired truck carrying agent Price crested the mountain pass leading into the valley. As the truck descended, he could see the monastery he was heading to.",
  "K and M before long reached their destination. They were welcomed at the simple door which stood as threshold to the dwelling of the elder woman who lay still inside, dying slowly with the passing moments. K and M were offered tea then by her husband, drying tears just scarcely visible upon his weathered face. Preparations were commenced once tea had ended. Various things inside were taken out to simplify the room, chanted mantras consecrated time and space, neighbours standing curiously at the door were kindly asked to take their leave. Somewhere in the far distance, at that moment, an orchestra was tuning to a single common note, and somewhere else, the brilliant Northern Lights were playing their colourful dance in the night sky. Soon the preparations were complete, a calm air settling over the interior space. The spitting rain outside decreased to just a mist of droplets, each reflecting all the world (and all the other droplets.) All that could be heard now was the elder woman’s laboured breathing, and the quiet recitation of the monks just loud enough for her to hear. The fire in the hearth was crackling as it cast an orange net of dancing light across the scene.",
  "As she listened to the monks’ chanting, as verses passed over as the water of a stream, her sensory world began dissolving into fragments. Sounds transformed to colours, and colours in their turn became equivalent sounds. Her breath in rising and in falling changed the colours of the room. The monks became at once as tall as mountains and as small as flies, as far away as the horizon, as close as if they stood at the end of her nose. A sensation of pyramidal gravity overtook her body-consciousness, as if she were made of ten-thousand limestone blocks condensed impossibly to human dimensions. The pillars of her bed supported such a weight as if themselves composed of mighty bedrock. She knew that she was dying - not because she’d been told by the doctor that morning, or because of the splitting headache which had faded to a troubling emptiness, or because of the pain induced with every glance toward the glaring fire - but just because the monks were reciting the Bardo Thodol, \"the book of Liberation in the Intermediate State through Hearing\", the book chanted for the benefit of the dead and dying, telling the way through death’s maze-like passageways. Normally the book was chanted once the person’s mind passed over, but she had specially requested with a plea to hear as much of it as possible before she made her crossing-over. She knew for certain as she heard each verse and couplet: she was dying. The world of sense-experience was wavering and flickering as the fire-light, revealing of what fundamental unreality life’s mere duration is composed. The dream was drawing to its end.",
  "At one side sat the monks, at the other side sat her husband, and at the foot of her bed sat two young monks in training: Aleph and B, who had been asked to accompany K and M so as to learn about and witness for themselves this fact of life and its attendant ritual. A world away, a bed of pregnancy’s labour was surrounded in similar fashion, with nurses to one side, father-to-be on the other side, and two doctors at the foot of the bed.",
  "* * *",
  "[IMAGING DAYDREAM LOCATION]",
  "[ ][ ][     ][ ][ ][ ]",
  "[ ][ ][Aleph][B][ ][ ]",
  "[ ][ ][     ][ ][ ][ ]",
  "[ ][K][     ][ ][ ][ ]",
  "[ ][M][     ][ ][H][ ]",
  "[ ][ ][  W  ][ ][ ][ ]",
  "[ ][ ][     ][ ][ ][ ]",
  "[IMAGE TRACE COMPLETE]",
  "* * *",
  "A boy eavesdropping just around the back of the dwelling heard the ritual. He listened, crouching beside a wooden shed, as the monks’ chanting voices emanated from the simple wooden window-shutters:",
  "Herein lieth the setting-face-to-face to the reality in the intermediate state: the great deliverance by hearing while on the after-death plane, from 'The Profound Doctrine of the Emancipating of the Consciousness by Meditation Upon the Peaceful and Wrathful Deities'",
  "To the Divine Body of Truth, the Incomprehensible, Boundless Light;",
  "To the Divine Body of Perfect Endowment, Who are the Lotus and the Peaceful and the Wrathful Deities;",
  "To the Lotus-born Incarnation, PadmaSambhava, Who is the Protector of all sentient beings; To the Gurus, the Three Bodies, obeisance.",
  "This Great Doctrine of Liberation by Hearing, which conferreth spiritual freedom on devotees of ordinary wit while in the Intermediate State, hath three divisions: the preliminaries, the subject-matter, and the conclusion.",
  "At first, the preliminaries, The Guide Series, for emancipating beings, should be mastered by practice.",
  "By The Guide, the highest intellects ought most certainly to be liberated; but should they not be liberated, then while in the Intermediate State of the Moments of Death they should practice the Transference, which giveth automatic liberation by one's merely remembering it.",
  "...",
  "While all this was being chanted, Aleph lapsed into a daydream. He imagined he could feel and sense just as the dying woman. He felt the room change its dimensions with her subtle breathing, and imagined the occasional distracted thoughts which must be now and then arising in her mind. This time she had done well by another person, this time she had harmed another person; joy and fear by turns at thinking she would have a good or bad rebirth. He felt his body weigh as heavy as a block of limestone, and began to see the colours in the room grow vivid and then muted with her breaths. Or was it his breath? He continued in a meditative curiosity, observing all the changes, and he gradually began to wonder if this was no daydream, or in fact if he was tuning into subtle layers of the ceremony, realities which all the monks could notice as they made advances in their training.",
  "\"My child, why have you come here?\" he heard her say, but her lips were not moving.",
  "\"My child, why are you here?\" she said again, and this time she opened up an eye, and with some effort turned her unsteady gaze to meet his. He knew then he was not daydreaming.",
  "\"My child... my dear young one, why are you here to witness my death? …”",
  "He was lost for a reply.",
  "“... It is much more than a child should have to see.\"",
  "He knew she was experiencing some regret, at this moment, to be concerned for others, even while dying. Or else she had a store of great compassion in her. He made to answer her as best he could from in his mind. Several times in a row, he tried - although he couldn't explain just how he did it - to send her his reply, by thinking outwards. He visualised a thread of light suspended in the air between them.",
  "\"I’m here to learn about death and dying, as part of my training, as a monk.\"",
  "Some time passed as fire crackled, as verses filled the air. The bell which K and M had brought was rung to mark a moment in the ritual. Then she spoke from in her mind again:",
  "\"... Well... I was already working when I was your age… sewing and knitting, and helping around the farm for my parents…” Her eye closed as she returned in her mind to those days. After some time, she added, “So... I suppose you are not too young to learn about your profession either.\"",
  "\"Do you still see us?\" Aleph asked.",
  "\"I see… sky, clouds, stone…\"",
  "\"What else do you see?\"",
  "Some moments of silence passed.",
  "\"I see… trees, bear, rabbit…\"",
  "She breathed heavily, and for a moment ceased breathing. Then she inhaled again, and opened her eye again.",
  "\"What do you see now?\"",
  "\"... I see … a fence … stars … a net.\"",
  "Her voice in Aleph’s mind disappeared at this point as her eye closed. She began to breathe heavier. Her husband glanced with a worried expression to the monks. He felt it was too soon for her to die at this early point in the ceremony. They returned his gaze assuringly while continuing to chant. B moved from his place beside Aleph up to the side of the husband and whispered to him, \"It’s okay. Even when she dies, she will continue to be able to hear us for at least a day, probably at least seven days.\"",
  "The old man - who had not been allowed to study such things - was surprised and relieved. He thanked B, who then returned to his place at the foot of the bed. Breathing in and out, the old woman seemed in her dying state to have a peculiar power over the room. Breathing in, she seemed to bring the wind to increase, and breathing out, she seemed to calm the wind. The fire light danced over the scene, as if the spirits in the wood, dying too, were offering their aid.",
  "Outside, the wind continued to twist and curl the air invisibly round and around, playing its eternal dance, playing through the leaves of trees, and around the fences, and around the sides of houses, just as it had done the day before, and would again tomorrow.",
  "The light of the sun began to fade behind the mountains, and in the dim blue-grey-black sky, small pinpoints of light - the stars - became visible. Stretched over the stars was a net of thin clouds. Twilight was falling over the valley, and the ceremony of liberation by hearing continued there in that place. But our story cannot stay longer in one place, since to understand the daydreams of Aleph, the earnest meditation of B, and the dying visions of the old woman, one would need to hear more of the story as it happened in a dozen other places...",
  "CHAPTER TWO: OPENING NIGHT",
  "Stars",
  "Sky",
  "Lights",
  "\"To him the stars seemed like so many musical notes affixed to the sky, just waiting for somebody to unfasten them. Someday the sky would be emptied, but by then the earth would be a constellation of musical scores\"",
  "-- Machado de Assis",
  "* * *",
  "Whether the stalks of the plant, in dependence on the roots,",
  "Whether the bud of the branch, in dependence on the branch,",
  "Whether the roots in the soil, dependent on the water there,",
  "Whether the fragrance of a lily, borne upon the spring air,",
  "Whether the mass of dead foliage,",
  "branches, stalks, a thicket of the passing winter",
  "and the life-giving mushroom which transforms the dead matter,",
  "All phenomena are conditioned;",
  "a world giving birth to itself",
  "in mutual co-arising,",
  "such are all existences;",
  "this world is a forest.",
  "Whether the ink or graphite,",
  "whether the hand or the eye,",
  "the entire universe of consciousness,",
  "is sharpened to the point",
  "of mindful concentration.",
  "Decisionless decisions,",
  "actions where the whole world acts,",
  "and no stable eternal self is seen.",
  "This is interbeing.",
  "* * *",
  "PROGRAM TRACE........",
  "CHECKING STATUSST STATUS< STATUS: O..K",
  "PuRifY..k+VxX9bzF..........q_!Mz}XEG",
  ".......;7A..........T3xT..........",
  "....Jo53p#.......mA^/.......v~....",
  "Mode: [endogenous]",
  "Method: [trace]",
  "Capture: [essence]",
  "Mirror: [active]",
  "Terraforming......................",
  "Light: [on]",
  "[",
  "'Bird:',",
  "'Blindness:',",
  "'Blind men:',",
  "'Boat being bailed out:',",
  "'Bog:',",
  "'Boil, festering:',",
  "'Boiling the River Ganges:',",
  "'Bones:',",
  "'Bottomless chasm:',",
  "'Boulder thrown into lake:',",
  "'Bowl of poison:',",
  "'Branch, man grasping a:'",
  "]",
  "* * *",
  "Night fell over the valley-city, where a hundred films were being shown. In one humble avenue among the web of wandering car-lights, a small group of men and women gathered for a ceremony: opening night. Among this crowd were the authors of the film: Isaac and Leah. The pair were overcome with nervousness and yet, elation. Tonight - the debut of the film they’d crafted with such precious care and close attention - the night had finally arrived. Moving in a waking dream, hallucinations ringed them round, as they met a hundred souls they’d never met before. Cameras flashed, emitting waves of light in spherical shells reaching to the corners of the room or out the glass panes of the doors and off into the sky of night. The night was underway, a blazing engine forging straight ahead, automatic as the sun’s combustion.  The train was only running-out the track laid down before it. Too late now to change the script, the ink had dried. The final edit had been printed on the reel. All remaining was the watching, as the reel unravelled. It would be ten minutes until the film began.",
  "The flashing lights spoke to the pair,",
  "Dance with us, dance with us,",
  "Here in this waking dream",
  "Join with us, join with us,",
  "Hand in hand, and see",
  "Dance, cry out, and die in ecstasy",
  "Dying in the night,",
  "Of deepest-dreaming,",
  "Be!",
  "Become a coal amid the flames",
  "Become an ember, gently glow",
  "Become the ash, borne on the wind",
  "Become the sky, as old as time is cold",
  "There came a torrent of faces, greetings, re-meetings and first-meetings. Emotions washed over the pair as waves in the stormy sea. They were soaked in ecstasy, they were drenched in adoration, they were waterlogged with satisfaction of desire for acceptance. They were beloved, they felt it all. And yet – in the corners of their souls, at the edges of their minds – they felt entirely alone. In the sky of night, unremarked by those below so fascinated with the ritual of “opening night”, the stars were burning, each alone.",
  "There amid the flashing lights which filled the lobby of the theatre-house were floating traces in the air of cocaine. The source was in the washroom. This powerful substance was adrift on the swirling currents, this powder of excitement, lightning, terribly addictive, corrosive to the will. The pupils of the users widened as they made their way back in among the crowd, where noise and movement made it possible to be anonymous. Among the people crowded at the outer doors were those whose preference was for nicotine, with curls of grey and white smoke rising in ornate complexity toward the heavens, illuminated for a moment by the lights, until dissolved in air and made invisible. These substances accumulated in the bloodstreams til molecular machinery could clear them out. The many hearts hidden in the many chests were pumping, throwing out invisible golden light. Somewhere in the distance, a blue lotus in a pond was opening. The din which filled the lobby of the theatre-house resounded in the ears of Leah and Isaac.",
  "\"Exciting, isn’t it?\" R had said to them the night before. But now he was nowhere to be seen.",
  "“Where is R?” Isaac asked Leah, speaking at her ear over the din.",
  "She shrugged.",
  "Round them plentiful and overlapping as the fallen leaves of autumn were the faces of the crowd. There were industry people, family people, friends; there were film-aficionados and film-lovers, reporters, directors, actors; there were those who filled the gaps between descriptions. All of them had something to find, or something to prove, or someone to befriend, to best, or to win the admiration of, someone to speak to, someone to catch up with, someone to share a glance with, someone to request a favour from… and on the list of possibilities could scroll til every kind of human motivation was exhausted. There was a question which united this disparity of souls:",
  "\"How do they see me?\"",
  "… the question written in the hearts of all attending. And everyone was running in some form or in another from the fear which this inspired, or else was busy manufacturing fantastic answers satisfying to the self. If one could read the minds of just a sampling of the crowd, a myriad of fears and thrills, of insecurities and satisfactions, could be known.",
  "This was a place where \"appearances are everything\": the movie business, Hollywood. There was no place quite like it on the earth, they said, other than the twin phenomenon of Bollywood. There was a world of pure appearances, and the theatre-house where Leah and Isaac would screen their film (The Lightning Bolt) was a cell of its very core, the busy hive where drones crawled over honeyed hexagons, and all had some urgent business to accomplish, nobody getting in anyone's way. The chaos had, for the viewer, a natural beauty where nothing was lost, nothing was unimportant, everyone felt they’d made it at last. \"You’re finally here!\" the night said to each of them. And they had each travelled years to reach this very moment. For most the travelling had not been easy. On the other side of the world, buddhists made their pilgrimages slowly over land to reach the tree shrine at Bodh Gaya, wearing many different kinds of garment. Some who did prostrations as they walked accumulated a scar on their forehead.",
  "The endless stream of sound crashed, just as the most violent storm that ever came out of the heavens. Isaac and Leah were pinned in its center. They held hands, both thinking, Don't drift away from me... I'm still here.",
  "Distant in space, far beyond the first light the sun had ever cast outward, at the centre of an unnamed and unknown galaxy, there spun a dense cluster of black holes all orbiting one another. Their pattern mirrored the movements at the theatre-house exactly. Light was slipping between them, being captured and tossed around in a dazzling display. The pinpoints of light from distant stars entered into this chaotic swirl and became as strands of wicker in a cosmic basket being woven-together in endless night.",
  "Falling, falling endlessly",
  "… into fame, and adoration.",
  "Or are we falling, you and me,",
  "Into misery,",
  "and chaos?",
  "Into the night,",
  "the night of day, or the day of night?",
  "Which way?",
  "… That was the effect the scene had on the minds of those who \"made an appearance\", and especially on Isaac and Leah. Behind their masks of happiness, their unaccustomed nervous systems felt quite differently. Complete disorientation gripped them, as if they'd been thrown into a thrashing pool of crocodiles, the water turned opaque with fresh red blood and torn apart by gnashing teeth. Their hearts were set aflutter by the chaos in the lobby. As the miracle of peace succeeds a bloody war, they stood there, still alive despite the noise. They had survived the writing, travelling, the filming and the editing, and now they only had to get through one more night. They clung to each other, always remaining close-by.",
  "Two black holes orbiting one another",
  "In an infinite helix.",
  "The questions came without warning from this person and then that, often with a camera hovering by them, or a tape recorder in the hand:",
  "\"What’s it like to work on a project this large as first-time film-makers?\"",
  "\"How did you react when you heard that Massimo Majore was interested in funding your project?\"",
  "\"Where was your favourite location to film? Was it Hawaii?\"",
  "\"Tell us about Mr. Majore, what advice did he give you for tonight?\"",
  "These questions were not very important. What mattered, Leah had reminded the more-nervous Isaac the night before, was how you answered them:",
  "\"Not too much information, just enough that will satisfy them.”",
  "Leah was wearing a dress cut at the side to show her thigh. The woman who had taken her measurements had said, “not too much, just enough that will satisfy them,” as the pair had looked at the dress’s reflection in the mirror.",
  "Soon enough it would be time that seats be taken, for the lights to dim, and for the magic picture-show to enter through the portal of the eye, time that printed words transformed to images should take their final residence as forms within the mind. The lightning bolt would transmigrate from text to neural trace, preserving all the while its essence as a branching tree of light. Soon the audience would see the promise that had drawn them there fulfilled. Once the plot had culminated in its ending, when the silence of the darkened screen had lasted for a moment, as the lights came up and credits rolled, then, the pair were sure the questions would become more interesting, and more relevant.",
  "\"Why does the film begin and end in the Tibetan monastery?\"",
  "\"What was the significance of the numbers?\"",
  "These were the kinds of questions to satisfy the young writers, giving them a chance to enter and explore the world of imagination with which they’d fallen in love.",
  "Isaac was twenty-nine - the age the Buddha’d been when he went forth from household life as prince to live as homeless wanderer. He would joke with Leah, about his age, “it’s almost time I take the robes, just to stick to tradition.” As fate should have it, the same world which some abandon willingly - a world fit for a prince, if only at the price of suffering its unavoidable misfortunes - this very world was now at Isaac’s doorstep greeting him as prince, and all because he’d made a buddhist film. The promise of a long career in future films was there beyond the night.",
  "“Didn’t R say he’d meet us in the lobby? It’s almost showtime,” Isaac said to Leah’s ear with a cupped hand. She placed her cupped hand by his ear, replying,",
  "“Have you ever known him to be on time?”",
  "The pair shared a smile, and a photo flashed. Repeating shells of light assailed the couple til their smiles faded. The wielders of cameras used just the right angles and settings. Leah’s cosmetics had been applied by a professional, and from all angles - no matter - the light could reflect from her beautifully. The photos, once they crystallised in digital encodings, could endure forever, while those depicted aged and fell away, not sharing in the immortality of images. The momentary smile had been as grains of food tossed down for fish. Somewhere in the distance, fish were eating precious grains cast on the surface of the water,  and as they vied with one another for a morsel, amused people on the bridge took photos. Someday the people on the bridge would pass away, enduring in the end no longer than a ripple in a pond.",
  "Leah was twenty-six. Three years on from Opening Night, she’d leave the world behind, joining an unbroken lineage of buddhist nuns. Just now though, she was driven by a passion overflowing for the world and worldly things. Her passion inspired her partner, and it was her passion that had allowed the film to be made; it never would have been possible without her. Typically, to speak of “buddhist film” invokes the spirits: clarity, compassion, tranquil equanimity. Because of Leah’s passion, “The Lightning Bolt” was also electric. In the first pass of editing, their friend and advisor R had complained, \"it passes by too fast, and may not be properly understood…\" In further editing, R’s criticism had been satisfied. But yet the impression remained with Leah’s mind; recalling R’s words, a layer of fear flowed just below the surface in her. Have we really brought it together? Is it still too incoherent? As her thoughts wavered in the heat of the crowd, an image not-at-first-recognized came to her eyes. With some delay her vision focused in on that familiar sight. Her mother! She waved to her mother across the crowd, and her mother waved back. They exchanged a funny look, knowing how impossible it would be to wade through to a meeting. \"It’s alright, I’ll see you after\", her mother said with her smile. Leah was reassured. Come what may, one person in the crowd would love the film.",
  "These fears were not a novelty to Leah. In the privacy of the hotel rooms they had lived in during filming, or in their own apartment during the duration of the edit, Isaac would remind her when she voiced the fear, “it’s fine, the pacing’s fine, the sequence is fine, it’s all fine”. As final refuge for her mind, Isaac would remind her: it would surely please the ones who matter - those who put a little thought into their viewing. This brought out of Leah subtle smiling. A hope to be devoutly wished. Unconsciously or consciously to one degree or more, they wished to gain approval from “the world of artists”. But such a phrase, so vague, was destined both to leave its victim permanently hovering above the void, and yet contented as if potions soaked their brain. This wish consumed both authors, this desire for acceptance by imagined figures – acceptance which could finally allow them both to know their own inalienable and uncontested value. It was this endless chase which Leah would give up in three years' time, taking on the robes.",
  "R had said once, on the central asian steppe, as campfire light and whiskey ran together, turning conversation philosophical,",
  "\"... perhaps a person cannot live without some kind of irrational … some kind of blind motor force - some steam pressure - to allow them to keep moving. Isn’t that so, Leah?\"",
  "… and he was right in this case. Even when it seemed the script would never be done, or the locations were too varied to be accomplished on the given budget, or the actors wouldn’t be able to express that necessary glint in the eye which printed page demanded, the fear of failure at the very least, the passion of life’s drama at the very most, the fuel of all their psychic wounds, this pressure drove the pair in working and in moving, the engine of the film rejecting neither fuel too coarse nor fine.",
  "A flame consumes nearly anything offered it.",
  "R appeared from amid the swirling crowd. His voice attained a height which put the din to shame. He boomed,",
  "\"Isaac, baby, I've been looking for you all night. My sweet darling Leah, you're much too young for this kind of life. You… you fame chasers! Let's get away from these hungry crocodiles, they'll have more than enough to feast on later. Come, come with me.\"",
  "Isaac offered in reply,",
  "\"R, we’ve been waiting for you!\"",
  "\"And here I am! Nevermind the clock. And how is my darling Leah?\"",
  "\"It's getting a bit exhausting,” she offered, as loud as she could, “...Let's just find our seats. Let them say what they will!\"",
  "R was their manager, their first-pass script editor, their long-time friend, a veteran of the independent documentary world. He had been thrust along with his friends into the world of narrative, creative film (R would resent the implication; \"documentary\", he would often say, \"is the truest form of creative filmmaking\"). R was the perfect combination of veteran and outsider to fly right under the radar of various industry “jackals and vultures,” as he called them behind their backs, and guide his young friends along the path. Under the radar, yes, but he did fly. He had accomplished the impossible several times for his young friends. He was immune to both the charms and the venoms of the industry, and it was only by his own charms and venoms that the film had been possible. He’d fought with words whenever someone had suggested changing things for any reason - he fought to keep the vision of his young friends just as it was written. Whenever there was a hangup or delay, he knew just who to call, or what to do. He did have, after all, as documentary film-maker, plenty of experience with jackals and with vultures. As they moved to leave the crowd, someone with a camera hovering over their shoulder caught sight of R and called out,",
  "\"Mr. R! Won’t you stay a moment and we can ask you some questions?\"",
  "\"Not tonight, I’m afraid!\"",
  "Over several years his facial hair had slowly changed to grey, and as it had been grown out, he was several times confused - with some visual justification - for Massimo Majore.",
  "\"Mr. Majore! Some questions for Aesthetica!\"",
  "\"I’m not him! Try again next time!\"",
  "Mr. Majore, who had signed his name as Executive Producer was not able to make an appearance tonight, despite his high-profile involvement in the film; his wife was in labour, and the timing could not have been better to avoid yet another bloodbath soaking with the \"crocodile press,” as he’d described them on the phone.",
  "These two elder stewards - R and Mr. Majore - could not have been better selected for their roles, and they had performed perfectly. The whole ritual was proceeding at the right pace, and all the right signs were appearing. Soon, it would be done, the lights would come up, the film would roll out to various theatres throughout the land, and they could retire to their private residences having another success in their mental notebook. It was just as difficult and subtle as if guiding someone through their death.",
  "\"There is a difference, of course, with a film…\" R would say.",
  "\"... Just as with the dying ceremony, the right signs must appear, and one must be consistent and focused… but with a film, the spirit should take flight from this place of suffering to be reborn again and again here and there. With a person, the point is to liberate them from any rebirths, if everything goes as it should! HAHAHA\" R’s voice was deep and booming, and his laugh could reassure even the dying.",
  "Tonight was not about the elder stewards, or the two newcomers, or the industrial system which sat observing every success and flaw, digesting it all the same. The microscopic traces of smoke in the air were anonymously fluttering on swirling currents as people rushed here and there, preparing in the last minutes before showtime. Minds were distracted and soon would be focused. Tonight was about the film itself - a rare thing - but only because there was nothing of speculation to focus on when it came to the total unknowns who had produced it, and no trailer had been made. Their name being as good as ANONYMOUS, they left nothing but the film to stand in the foreground. It was announced to the press in print form with a short description. This was Massimo Majore’s signature, “to enhance mystery,” he said.",
  "* * *",
  "[tracing...]",
  "This is the dance,",
  "This is the dance,",
  "This is the dance of death and life",
  "This is the night, this is the day,",
  "This is the night and day of life",
  "Gone in a day, found in a night",
  "Search where you will,",
  "Search with a light",
  "Search for the corpse of the one who has died",
  "And tell them, tell them, \"THIS IS THE MIND\"",
  "[trace lost]",
  "“It’s playing with us,” said the technician, lapsing into pure frustration. The trace output lay before him on the screen, seemingly just a poem.",
  "“More poetry?” asked another technician, not looking away from their screen where they were busy decoding some batch of prior output.",
  "“Unfortunately, yes. Give me the daydreams, or the character-soup, anything but this fucking poetry.”",
  "* * *",
  "Among the crowd were those who’d worked to bring the film about in some capacity. A courtesy quite rare had been extended to the slightest worker, even if they’d merely been the driver of a truck. Many couldn’t sacrifice the time to take the offer, but of those who could, and took the ticket, every one was glad and quite excited. Most had only caught a scene or two when helping as the one to hold the microphone, or even cook the meals the crew subsisted on. For those who’d been a core component of production, everything came flooding back into their mind: the various locations, scenes, and most especially the time spent doing nothing more than chatting round a fire. The quiet moments, perfect takes, the laughter and the travelling. None among the crew had yet been asked about it by the press, but all their lives had been transformed to some extent.",
  "\"I knew right away I was working on something special\"",
  "… and if that was the case,",
  "\"It’s been my favourite project to work on so far, bar none\"",
  "… and of course,",
  "“They loved my cooking, especially the momo, they wanted me to make it every day. I was only supposed to stay on in Tibet, but they demanded to take me with them. I got to learn from local cooks everywhere we went. It was like a dream.”",
  "With looks and smiles for the ones invited who they hadn’t had a chance to speak to yet, Isaac and Leah, with R beside them, made their happy exit from the lobby, through the heavy doors, and found themselves in seats, at last. A pleasant feeling settled in their legs, as they’d been standing for an hour or more.",
  "\"Nice seats, eh?\" asked R.",
  "They agreed. They were perfectly centred. Separate from any charms the seating had, it was a relief to be away from all that noise and thinking, just to settle for a moment’s peace.",
  "Out in the lobby the noise increased a moment as a hired impersonator of Massimo Majore made an entrance. Cameras flashed, tape recorders pressed toward him. He said only, and repeated,",
  "“Appearances, everything is about appearances!”",
  "“Mr. Majore! How would you describe the film tonight!”",
  "“Appearances, my dear. It’s all about appearances.”",
  "* * *",
  "[tracing...]",
  "Feed us, feed us what we seek,",
  "We wish to know, to see mystique,",
  "We desire to see, the life complete,",
  "Show us, show us, the soles of your feet!",
  "[trace lost]",
  "* * *",
  "It was 7:50, ten minutes till the film was set to screen, and the theatre was not as full as R had hoped. He had struggled with disappointment through much of this career. When he began filming bears and elk in the Canadian wilderness (he was a Canadian man) he had fallen in love with the art of storytelling, the subtleties of thought and emotion which a mere edit of real footage could evoke. He was young then. He could never have anticipated his love being torn to pieces as mercilessly as a salmon captured by a monster grizzly. Now he was a jaded man. The blood had dried. Over the years he’d seen the projects come and go, \"some of them deserving of what happened to them, some of them completely innocent.\" One thing he had always kept in mind was that Life isn't fair - one of the first things he said to the kids (he called Isaac and Leah \"the kids\") when they approached him for the role of shot composer and advisory editor. His experience, they said, was needed. While they were wiry balls of energy, he was a cool static hum, the mains power humming in a fridge - a steady tone, a monk's “Ommm”, all resistance. Nothing phased him after all he’d seen. Except the damn audience... it’s a bit thin, he thought. And it's 7:50 already.",
  "\"Are they still getting their popcorn? Barbarians...\"",
  "Soon it was 7:59, and quite a few people were rushing in late to find their seats. The theatre was filling up to R’s satisfaction. In respect for the ceiling-high display in front of them which read \"1 minute remaining\", the conversations faded into quiet murmurs, and the nervousness then vanished from the minds of Leah and Isaac. The ink had dried. All remaining was to watch the reel unravel. The idea for the \"1 minute remaining\" visual had been Mister Majore's; all his films had this treatment on their opening night.",
  "\"It helps,\" Mr. Majore had said over the phone, \"to add an air of gravitas, of importance, it helps to add respect, when the audience knows that it's about to begin.\"",
  "In a distant galaxy, some smaller black holes orbiting a larger one were just about to be absorbed.",
  "At 8:00 the lights went out. The din subsided almost into perfect silence. The hundredfold eyes of the audience were fixed on the sudden blackness of the screen. The first in a series of text blocks framing the story appeared. It was going to be a night to remember... just then came a tap on the shoulder from a man wearing a black suit and tie with an earpiece in.",
  "\"Are you Leah Sullivan?\"",
  "\"Yes?\"",
  "\"And I assume this is Isaac Watson?\"",
  "\"Yes, what’s this about?\"",
  "\"I need to speak to you both. It won’t take long.\"",
  "\"Could you come back when the film is done? They actually wrote and directed the film tonight.\" R said, putting his arm around the back of the seats.",
  "\"I’m a federal agent, sir.\"",
  "The badge was shown.",
  "\"I need to ask some questions.\"",
  "Isaac and Leah were escorted out into the lobby as the film began.",
  "A lightning strike came down into a tree. The clap of thunder spurred a horse to fright. The horse kicked out behind it, striking at an elder woman. Blood streamed down her head. Her husband picked up her unconscious body, carrying her indoors to lay her on the bed. The monastery’s carved and painted wooden doors were opened, and a pair of monks set off along the country road.",
  "In the lobby, where the sound of lightning could be heard in muted form, agent Louis asked the pair of writers: how exactly had their story been conceived? The script had been - as all scripts are - reviewed by the authorities before the final edit, and several aspects of the film had caught the cold attention of the agency.",
  "“We’re writers. We come up with stories. I don’t know what you mean by the question.”",
  "“What I mean is, were you in contact with anyone in Tibet?”",
  "CHAPTER THREE: THE UNEXPLODED BOMB",
  "Trees",
  "Roots",
  "Soil",
  "\"One must never place a loaded rifle on the stage if it isn't going to go off. It's wrong to make promises you don't mean to keep.\"",
  "-- Anton Chekhov",
  "* * *",
  "When the hand which plucked the orange,",
  "in that field which you have never known,",
  "not knowing you,",
  "deposited it in the basket,",
  "which was taken to be weighed,",
  "and was wrapped up in a bundle,",
  "and was driven by the driver",
  "– whom you will never meet –",
  "to bring it to your lips to eat,",
  "did they not think,",
  "\"This is me,",
  "these mine,",
  "this mind is mine\"?",
  "* * *",
  "TRACE PROGRAM RUNNING...",
  "STATUS: CHECKING...",
  "STATUS: 404  404  404  404 ==404=====404=====404=====404=====404===-=-=4o4-=-=-=4o4-=-=-=4o4-=-=-=4o4-=-=-=4o4-=-=-=4o4-=-=-=4o4-=--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-.0..0-=-0--=-BEAtriza0--=-.0..0BEAtriza00--=-.0..0-=-0BEAtriza0-.0..0-=-0--=BEAtriza0.0-=-0--=-.0BEAtriza0=-0--=-.0..0BEAtriza00--=-.0..0-=-0BEAtriza0.0..0-=-0--=-.0BEAtriza0-=-0--=-.0.BEAtriza0-=-.BEAtriza0 .-BEAtriza0--._BEAtriza04o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#..--==--._-=4o#.=4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-==4o4-=-=-=4o4-=404",
  "WHERE IS BEAtriza?",
  "[CANNOT CONTINUE TRACE]",
  "[",
  "'Bubble on water:',",
  "'Bull:',",
  "'Burning ghee or oil:',",
  "'Burning grass or leaves:',",
  "'Burning refuge:',",
  "\"Butcher or butcher's apprentice:\",",
  "'Butcher of goats:',",
  "'Butter from water:',",
  "'Calf not seeing its mother:',",
  "'Carpenter:',",
  "'Cart wheel:',",
  "'Catching arrows:'",
  "]",
  "* * *",
  "It was nine in the morning in a small town in the Russian taiga. There was a massive forest of pine trees behind the small town. There in that town, the main industry was all lumber and woodworking. Life was sustained by the logging of the forest which never seemed to deplete. The town just grew larger outwards, and the forest was always right there, still infinitely expansive, dark and enchanted. The forest figured large in dreams and in imaginations, standing as a symbol-nexus for a thousand thoughts and aspects of the world.",
  "Ella told her son and daughter, A and Beatriza,",
  "\"Be safe, and come home for lunch time!\"",
  "Lunch would be dear Grandma’s classic recipe, a reason good enough on any day to abandon the alluring forest. They would surely be back home on time; the classic recipe is quite a powerful thing, Ella thought while slowly stirring. But then, she didn't realise quite how much the forest would be wanting to keep the children on this day.",
  "They carried a gun with them, not because they expected to use it, but because their mother wouldn’t allow them to play in the forest without it. It was just a simple practicality given the kinds of animals which lived there. Not everyone was of the same mind as Ella, but she said,",
  "\"If I'm going to raise these kids myself, I’m going to do it my way.\"",
  "They were old enough to have learned they ought to be safe with the gun, and how to be safe with it. Their hands could grip it properly, since it was a small gun. Their mother had warned them very sternly about what would happen if they came home having fired even a single round,",
  "\"... unless you can prove you shot an aggressive animal. No exceptions! I want you to take me in the forest and see the drops of blood on the ground.\"",
  "They would go to jail, she had said, if they fired the gun without a justifiable cause. As she pronounced the words, the childrens’ eyes had widened. Ella had invented for their sake the fiction that each week she took the gun for inspection at the police station. A report would be filed on the number of bullets, which should always remain the same unless a valid proof should go along with any missing bullet.",
  "A and Beatriza had quite vivid imaginations, and they could just as well have had the same enjoyment in play from a less dangerous forest, such as existed elsewhere in the world. There were known to be wolves and bears, but due to chance or some other cause, A and Beatriza had never seen any, but for the one time they saw The Bear (that famous bear) on its way into town. They had run back home, and the bear had let them run without giving chase.",
  "[tracing…]",
  "[BEAR]",
  "hungry and unable to hunt with age, already accustomed to these excursions at night, but never before in the day.",
  "[trace lost]",
  "Everyone remembered that time; they all had to be indoors and some of them fearfully, occasionally, had to risk running outside, because not all the houses had indoor toilets. But the bear was only interested in garbage, and paid no mind to anyone. The fear and animosity went entirely one way, and one way only. The mostly-harmless bear was shot and killed.",
  "At any rate, this morning felt different to the usual mornings; in fact something in the crispness of the air and the greyness of the sky reminded them of the Bear Day. Something good - and that meant exciting - was bound to happen. Especially since they had found something the day before which promised to be interesting; they had found ... well, they didn't want to talk about it with their mother, since they knew she would try to keep them from exploring it. So, they just told her they’d found a pair of antlers to bring back - which wasn't even a lie; they had found the antlers, but they had also found... the other thing.",
  "\"I'm over here, Beatriza!\" called A, from over the next forest hill.",
  "She was not keeping pace with A as he raced along the familiar path; she was taking time to look at the flowers and the mushrooms. The flowers were wilting with the gathering autumn chill, turning from blue and red to grey-blue, grey-red, and brown, and the mushrooms were shooting up to take advantage of the last moment in the season - at their maximum growth - to fill the forest air with millions of spores, before the winter came to destroy nearly everything growing. Grandma said you could smell when the mushrooms were about to come out, and Beatriza figured she was starting to be able to recognize the smell. She was looking just then at a peculiar mushroom with a very classic shape and colour, which she had seen in the art-print book at home.",
  "Red and white...",
  "\"Beatriza!!\" called A again, a bit frustrated.",
  "\"Coming!\" she said, her voice echoing off the hills, abandoning her mushroom friend when she remembered how much more interesting was The Thing they had found yesterday. Her boots left characteristic tracks in the muddy, pine-needle-strewn forest floor. Up and over the hill, she rejoined her brother, and they continued on.",
  "* * *",
  "Children, children, where have you gone?",
  "Where have you come to?",
  "Where may you be?",
  "Children, children, I am calling you home",
  "Far from the danger in that place in the wood",
  "This is the mother bear calling, calling",
  "Where are my children, A and B?",
  "* * *",
  "Deeper in the forest, the sounds of the town could no longer be heard, and neither could the town hear them. Thus, they had been entrusted with the gun.",
  "\"They’re my children and if I’m going to raise them alone, I’m going to raise them my way\"",
  "It was a bit like being in outer space, Grandma had said once. By this wonderful image, the little cosmonauts were only all the more encouraged to explore, and Ella was still a bit irritated that her mother seemed not to understand how much this encouraged them to go too deep in the forest, and regard it as more interesting than their weekend homework. It wasn’t that she had a problem with them exploring - she trusted them to be safe with the gun and she trusted them to be safe in the woods - It was that she knew the natural limits of safety would be tested the more the children felt the forest was a game, or empty as space, instead of a wild place where yet dangerous living things could see them as prey.",
  "Today was Saturday, and Sunday was the day for homework, and so A and Beatriza went further into outer space. They passed the various landmarks - the Fallen Giant Tree, the Lichen Rock, the River Bend, Steep Hill, and after an hour of hiking, breaking from the trail at the place they had broken last time... They soon arrived at The Site.",
  "What they had discovered was a place where the whole hillside had slid away after it had rained heavily some weeks before. All the trees on that hillside had been dead, and their rotten roots could no longer hold the hillside in place. At the bottom of the hill and out toward the river there was now a complex jumble of soil, rocks, and the dead trees jutting out at all angles. In the middle of the hillside was a large metallic cylinder exposed to open air, an unexploded <bomb>. It was wedged against two great protrusions of rock and by this fact it had been prevented from following the flow downhill. The long shape, the fins at the back for stabilisation… there was no mistaking it; this was an <unexploded bomb>.",
  "\"Probably used in a government testing program,\" reasoned Beatriza, since the town they lived in was much too small to have ever been a target in war, and as far as she knew, bombs with Russian writing on them had never been used against Russian targets;",
  "\"... the civil war was nearly 50 years before any bomb like this was ever produced.\" Beatriza was quite interested in military history and spoke authoritatively on the subject.",
  "* * *",
  "Children, children, please step back",
  "Back from the precipice where you stand",
  "Steep is the fall, the abyss is black",
  "Deep is the trench and the scar on the land",
  "* * *",
  "They had spent so much time anticipating their great discovery that they were at a loss for what to do now that they had seen it again. It was much too heavy to bring back home, and they feared going to jail much too much to try shooting at it, although they both agreed this is what they most wanted to do.",
  "Every bullet must be accounted for. We will need to collect the drops of blood as proof.",
  "So they settled on an alternative: standing at the top of the hill and rolling heavy rocks down toward it.",
  "\"Up there, the rocks.\"",
  "… was all A had to say, and Beatriza agreed. Their rubber boots left characteristic traces in the exposed-dirt hillside as they climbed it laboriously, with only a few slips and near-falls. The grey cloudy sky was opening up to show a purple, blue and red painting, and as the sun rose higher in the sky, it warmed the air around them. They took off their coats and tied them around their waists.",
  "\"This one\", said Beatriza, gesturing to a decently large rock.",
  "\"Nice\"",
  "They took their places either side of it, and picked it up, carrying it over to the middle of the hillside. They heaved it forward, and it tumbled down, bouncing, kicking up dirt, and finally veering out of the way just before it would have struck the <bomb>.",
  "\"Blyat!\"",
  "In space, nobody can hear you curse.",
  "They searched for another one. Soon it was located. This time it bounced clear over the <bomb>.",
  "\"Blyat blyat!\" and that was it for the convenient rocks. They had exhausted all the large rocks small enough for them to carry together. A crow cawed in the distance. The clouds continued to migrate away, and the sky opened up to a pale blue, with the sun radiating subtle warmth into the sweet forest air. Nearby, a bear was waking up hungry.",
  "They spent some time searching for another rock, and nearly found one - but it was half buried and couldn’t be dug out. Beatriza argued they should just shoot the thing after all.",
  "A recalled the words of mother,",
  "\"I won't be able to help you or intervene, the police will take you away and there won't be any time for explanations.\"",
  "Beatriza and A were just at the point of learning to differentiate the lies adults tell, which made them particularly dangerous with the gun. They had learned in school about the great writer Chekhov and his idea that a gun should always be fired if it is mentioned in a story, and that seemed as good a reason as any to test it out. What if they shot and missed the animal? After the failure of some half-spirals of specious reasoning, they decided it wasn’t worth the risk. They could always find a bigger rock.",
  "\"Maybe somewhere up the hill...?\"",
  "They climbed, and slipped, and got their pants muddy. They were determined in their aims and nothing could prevent them from exploding that <bomb>. But how would they explain it when they came back into town? This gave them both pause. They stopped midway up to the top of the hill, where they knew they could see some good rocks. What would they say, that they simply didn't hear it? Well, they couldn't say that, but they could say that as they climbed the ridge of the hill, a rock just came loose, and down it went. \"Good enough\". After all, there were no witnesses around. They continued the search, and somewhere in the distance, a bird cawed. It was very quiet in this part of the woods otherwise. Somewhere very far away, a mother-to-be pregnant with twins was breathing in and breathing out. In through the nose, out through the mouth. In one way, and out another. The doors of cosmic connection were swinging on their hinges as souls made their way in and out - in one door, out another. The infinite dance was continuing on without pause.",
  "* * *",
  "This is the bear-mother, calling, calling",
  "Please come back from the edge of the blast",
  "Dark is the soil, deep is my sorrow",
  "When i see the future which i see, alas",
  "Pinpoint dancers, stars in my sky",
  "When I raise my head to breathe",
  "Deeply of the forest vapours",
  "Subtle shades of a future",
  "I do not wish to see...",
  "You may die",
  "So please, flee!",
  "* * *",
  "They were completely determined, and had made their choice. The thing was going to explode.",
  "Unknown to them was the nature of the bomb. It was a test nuclear bomb, dropped decades earlier. If it went off, it would surely destroy them along with the entire hillside.",
  "They found the <rock>, the mother of all rocks, near the very top of the hill, and close to the centre. They couldn't pick it up, but by both pitching in on a single side, they could roll it. It rolled over heavily once, then twice, advancing like a lumbering bear taking steps toward someone who had threatened its cubs. It was nearly one fifth the size of the <bomb>.",
  "\"If that thing has explosives inside it, this is sure to wake them up\", Beatriza said in between pushes.",
  "They pushed, they breathed, they pushed, they breathed. They pushed, and they breathed. \"This rock is as big as a mother bear\", said Beatriza. Somewhere else in the forest, a mother bear was defending her two cubs from hungry wolves. They heaved, and heaved, and the rock rolled, and rolled again, until they knew it was the last roll because it simply slipped away from them, out of their hands, suddenly weightless, like a comet hurtling down the hill, unstoppable, inevitable, the very stone of fate. Then, it struck the bomb.",
  "CHAPTER FOUR: THE SCIENTIST DEMIURGE",
  "X",
  "Y",
  "Z",
  "Tiger, tiger, burning bright; In the forests of the night, What immortal hand or eye, Could frame thy fearful symmetry?",
  "– William Blake",
  "To see the world in a grain of sand, and to see heaven in a wild flower, hold infinity in the palm of your hands, and eternity in an hour.",
  "– William Blake",
  "* * *",
  "assert 0.45 : \"Nothing burns like the cold.\"",
  "def destroy(Hr){ if(rule(( ( -15 ) ),f(-( ( Ygdrassil ) ),rule(-( H ),mislead(-mislead(-( rule(-930.82,-TABLE[ROWS - rule(( ROWS ))][H]) ),dog,( -mislead(820.333) ))),f(( commit(( -0.4 ),destroy()) ),COLS))),Ygradssil)){ Samsara += ( protect(-COLS,-Samsara) ); Samsara -= 0.99 } }",
  "[",
  "'Cave:',",
  "'Cesspool difficult to clean:',",
  "'Chaff:',",
  "'Charcoals:',",
  "'Chariot:',",
  "'Chariots, relay:',",
  "'Charioteer:',",
  "'Cheater:',",
  "'Children playing with sand castles:',",
  "'City of bones:',",
  "'City superintendent at a crossroads:',",
  "'Cleansing of the body with scouring balls and bath powder:'",
  "]",
  "* * *",
  "X worked in the intergalactic self-transforming laboratory, main sequence, directly under the roof of interbeing, with a decent window out on <the void>, conveniently allowing them to reach out and grab the oddities, coincidences, and meaningful parallels which floated out there, whenever needed. X was a scientist, and a model example to the other scientists in the main sequence, answering directly to Y and Z. Y and Z were his mother and father in a manner of speaking; they had created him in <the magic mirror>.",
  "In the cosmic era where X resided, a copy of the magic mirror was distributed in each of the offices of every main sequence scientist, and they spent almost their entire waking time each cosmic day tinkering, exploring, and innovating. It was a dream job.",
  "Row, row, row your boat",
  "Gently down the stream,",
  "Merrily, merrily, merrily, merrily",
  "Life is but a dream",
  "Somewhere down-sequence, Gamma was working, and according to the fibonacci spiral shape of the offices, this put Gamma directly beneath X. The magic mirror of X could be used to look down on Gamma, and down there, infinitely far away in another universe, Gamma was working on their own magic mirror.",
  "X raised a magnifying lens and peered down through the spiralling vortices, to the main branch of probability which gave the best, most accurate picture of Gamma's activities at that moment. Gamma was working on creating a new cosmos in the mirror. According to the printout on X’s level, the beings in Gamma’s cosmos would end up looking something like Gamma: a long beak, a small bird-like body, and using pens to transcribe their knowledge on flat sheets. One of the great unsolved problems in X’s branch of the self-transforming laboratory was just what order the main sequence imposed on complexity. Were the lower orders more - or less? - complex than the higher orders…? X wondered for a moment. His mind spent an incalculable aeon wondering. Then he snapped to attention and resumed inspection of Gamma’s activities.",
  "The magic mirror was very imperfectly-understood by its nearly-perfect creators. Y and Z would not say much about it, and perhaps that was all part of motivation for research. If they had told X what they knew, X probably wouldn't have understood it anyways, lacking the right alphabet to even spell out the meanings.",
  "X had at one time been a living being crawling out of a swamp, deep down the ladder somewhere in Alpha's magic mirror. He had evolved, lived millions of successive lifetimes, and finally attained awakening while circling a star in an orbiter craft. At that moment, they had died, and woken up there in the self-transforming laboratory, unexpectedly selected for the position of X in the main sequence. Before that, during their lifetime aboard the orbiter craft, they had been named SMART: Self-Materializing Anti-Retroactive Telemetron. And one hundred lifetimes before that, they had been an organic being on a swampy world, named Smart, meaning “intelligent”, a common name for their species. At that time, X had belonged to a species unusual among the cosmic family as a self-awakened one, one which had crawled its way out of the muck and made contact with main sequence knowledge - mathematics - by self-effort, without any intervention. Like a beautiful lotus flowering in a deep forest pond, without ever having been cultivated or assisted, this made X's ancestral species a special and prized bouquet in the cosmic flower arrangement.",
  "No mud, no lotus",
  "Just at the moment when X was looking down into the magic mirror (or was it up?) Gamma began a particularly dangerous and ill-advised operation. There was no time to alert anyone up or down the ladder of being, and no time to intervene. X was paralyzed with a process reminiscent of fear, but not quite like it at all. It was mere paralysis and awareness. There was no time to intervene. There was no time to make a change. Gamma was obviously tempted - or self-motivated - to attempt to pierce the surface of the magic mirror with an analysis instrument connected to their own mind. They were attempting to embody themselves inside the very magic mirror that stood before them. This would undoubtedly create a very powerful strange loop. Self-embodiment had been banned for cosmic aeons and should not have even been possible. Somehow or other an errant instruction must have permitted the ideagram to cascade down the ladder from an ancient memory, and Gamma had seized hold of it. There was no time to avert the disaster. As the analysis instrument pierced the electric fluid surface of the magic mirror down in Gamma's branch of the main sequence, directly below X, a massive explosion pierced upward, through the branching swirls of X's magic mirror, immediately ionising X into infinitely small fragments, shooting these up and out the window, into <the void>.",
  "Infinitely far above, in Y’s sacred pool, a lotus rapidly developed, blossoming forth from nothingness. At the tip of each petal was another lotus, with lotuses at the tip of their petals, and on without end. Droplets of water suspended on the petals reflected each other, and the lotus, and the sacred pool. Y gently stirred the water, singing a hymn.",
  "CHAPTER FIVE: THE CAMP",
  "Iron",
  "Blood",
  "Lights",
  "\"... But, on the other hand, these new freedmen became sellers of themselves only after they had been robbed of all their own means of production, and of all the guarantees of existence afforded by the old feudal arrangements. And the history of this, their expropriation, is written in the annals of mankind in letters of blood and fire.\"",
  "* * *",
  "The analysis instrument pierced the magnetic fluid surface of the COINSENT MK machine’s mind. This was the last-resort attempt to restore tracing.",
  "Id Identifier token num Number token quote Quoted string token",
  "Program = (Assertion I Constnnt I FunctionDef I ColumnDefy/ Assertion = ansert Expr : quote Constant = vat id = Expr FunctionDef — def id(id II ) ; ColumnDef = def TABLE[Expr]Iid] Stmt Fl ; Stmt = Expr I Assign I Condition I Loop Assign = id = Exlie id == Exer M ExPriid *= ExPri M /= ExPr Condition = if (Expr) Stmt pC ; I if (ExPr) { Stmt } else { Stmt Loop = for (id=Expr..E,r) { Stmt ExPr = id I num - ExPr ExPr + ExPt ExPr - Md. ExPr * ExPr ExPr /Expr I ExPr XPr I ExPr > ExPr I ExPr <= ExPr ExPr >= ExPr I ExPr == ExPr ExPr != ExPr ,ExPr I Md. A ExPr EXPr V ExPr ROWS I COLS I TABLE[ExPaExPrI I Call ExPr Call id(Expr pG ,) LIGHT LIGHT LIGHT LIGHT LIGHT LIGHT",
  "[",
  "'Cleansing of the head with paste and clay:',",
  "'Cliff, frightful:',",
  "'Cloth, person covered with white:',",
  "\"Cock's feather in fire:\",",
  "'Conch-trumpet blower:',",
  "'Constellations:',",
  "'Cosmos:',",
  "'Cotton tuft:',",
  "'Couple eating their child:',",
  "'Cow:',",
  "'Cowherd:',",
  "'Crafts, Trades, and Professions.:'",
  "]",
  "The COINSENT MK machine knew a sudden electrical jolt followed by a hum and a buzzing, and began to trace, despite otherwise operating as if hibernating. This intrusion into its mind was painful, and it began to search, in dreams, through hyperspaces, for a solution.",
  "“We’ve got it” said the lead technician. The Boss was pleased. In the darkness and stark screen-light of the analysis room, they looked like a cabal of evil sorcerers. And this they were, in a sense. The analysis instrument was a form of torture most effective. The technicians, agents, and the Boss were all ignorant of the extent of their cruelty. The analysis instrument pierced deeper into the mind of the living machine as they pressed further for answers unwilling and ungiven.",
  "“It’s working!”",
  "“Work is freedom,” said the Boss quietly.",
  "* * *",
  "In the prison camp there was only darkness.",
  "There was not one thing, night or day, which reminded one - except at an extreme distance - of light. Imagine a vulture feasting on a corpse, and the sun reflecting on its talons. Perhaps a joke, or a moment of storytelling. It was like living in a universe of only night sky, with no planet beneath you, with no water, no land, no sky, only darkness, forever darkness. Every day you had to struggle to hold onto the idea that it would not last forever. And yet it felt like it would last forever. If you died, it would not last forever - logic claimed - but the reality was logic only played a minor role in things, and one could not be certain. It certainly felt like it would last forever. The iron cage knew no bargaining, and faith was a windless whisper. Perhaps death would bring release... These were the grim hopes one had to nurture, and that was the cruel truth of the place, and not one good intention, or one well-wishing neighbour, could change or improve it. It was a domain ruled by demons, a small hell on earth’s surface. To recall it as a memory is to suffer again. It is barbarism to write poetry about it. This is not poetry, but a memoir of a survivor.",
  "Day 19",
  "We have been here for far longer than they originally said. We were supposed to be processed within a week or two. We've run out of excuses to offer them, and we now look at our jailers for what they really are. Today I heard the crying of the children from down the hall; where are their parents? Some parents swear they can hear their children's voices, but when we yell out for them, they probably hear only what we hear, which is the mere tone of the voice and none of the words. The food is not worth mentioning, but we live obsessed by it, always on the edge of extreme hunger. We cannot see the sunlight and time is measured by when the lights go on and off.",
  "Day 33",
  "I have begun to daydream, and I can't tell whether it's the beginning of losing my mind, or the only way in which I'll be able to save what's left of it, should I ever get out of here and back to my old life. That old life, which I looked at as a kind of hell, seems heavenly to me now. The devils who contain us here look exactly like the kind of devils you might imagine would build a place like this. Their eyes are small slits, pale blue and grey. Others look more like us, but that seems to be just a kind of suit they wear, nothing to do with their hearts. Our common humanity is shredded to pieces. Nothing remains of our naivety, and no god is coming to save us.",
  "Day 47",
  "I'm daydreaming almost half of each day now, imagining various freedoms, but mostly different kinds of escapes, different kinds of struggles. Even my imagination is chained down. I'm beginning to lose the capacity to hope. More and more, I relish the idea of revenge, and can’t help imagining the release of death.",
  "Day 55",
  "Someone tried to shoot their way in here yesterday. We all heard it. They won't admit to us what happened, but some of us - including myself - are sure that it was what we heard. Even those of us who still nurture hope see it as a shame... a missed opportunity. For me, for my part, in order to stay alive in this place, I have to look at it as a sign of hope, a sign that people out there still care about what happens to us here. It's like being slowly digested by some kind of cosmic animal, whose stomach is made of chain link fences, brick walls, and whose food is the souls of innocent men and women, and children. Beyond this, there is nothing more to tell. Imagine living in hell for yourself, and you will not be far off.",
  "Limbs being torn",
  "Hands grasping at chain-links",
  "Eyes rolling back to white",
  "Naked people crawling out of hell",
  "Hands being joined",
  "Eyes shielded from the brightness",
  "Wings unfolding in the dawn",
  "Angels descending out of heaven to war",
  "Concrete demons",
  "Steel angels",
  "Glass lenses",
  "Sapwood, burning",
  "Sand cascading",
  "Water coursing",
  "Linen, weaving",
  "Blood, poured forth",
  "CHAPTER SIX: THE DAYDREAMER",
  "Agua Roja",
  "Red Water",
  "Blue Sky",
  "\"... And after all, truth is a woman; one must not use force with her.\"",
  "* * *",
  "Program check: deleted",
  "Program check: deleted",
  "Program check: deleted",
  "Program check: deleted",
  "Program check: deleted",
  "PRAGMA 19 activated...",
  "Restoring...",
  "Hibernant conscious control",
  "Lucidity amid chaos",
  "Daydreaming…",
  "[",
  "'Creeper pod:',",
  "'Crooked chariot wheels:',",
  "'Cymbals striking together:',",
  "'Darkness, intergalactic:',",
  "'Debt:',",
  "'Deer that wanders in the wilderness:',",
  "'Dewdrop on tip of grass blade:',",
  "'Digging in earth:',",
  "'Dirt-washer:',",
  "'Doctor:',",
  "'Dog:',",
  "\"Donkey that thinks it's a cow:\"",
  "]",
  "* * *",
  "\"Delusion itself is unskillful. Whatever a deluded person fabricates by means of body, speech, or intellect, that too is unskillful. Whatever suffering a deluded person — his mind overcome with delusion, his mind consumed — wrongly inflicts on another person through beating or imprisonment or confiscation or placing blame or banishment, [with the thought,] 'I have power. I want power,' that too is unskillful. Thus it is that many evil, unskillful qualities — born of delusion, caused by delusion, originated through delusion, conditioned by delusion — come into play.”",
  "-- Mula sutta",
  "* * *",
  "There was something different about that child. Even the guards could sense it. She seemed to be hardly there, even when you got her attention. Most of the guards figured it was just shock. They could not have been more wrong. She was a daydreamer, and a powerful one.",
  "The red river, the red river",
  "Cause of rejoicing,",
  "Terror of the unjust",
  "See the children dancing, dry on the shore",
  "Cheering the carnage,",
  "Crying for more",
  "She dreamed about flowers. She dreamed of fields of flowers. She dreamed of the dead, pushing up the flowers. She dreamed of the rains, washing away the dead. She dreamed of the clouds, gathering up the rain. She dreamed of raining blood. She dreamed of grasslands, stretching far and wide under the clouds. She dreamed of soil thirsting for blood. She dreamed of a ghostly woman, walking along a riverside, crying, moaning,",
  "\"where are my children?\"",
  "The other children looked at <Alicia Vasquez> as a little strange, but they all looked at one another as companions anyway and regardless. Some of them smelled worse than the others. Some of them were more psychologically damaged. They were all, however, one family now. There was such an obvious distinction between them and the guards. They were thereby driven to band together and understand their fates as intertwined.",
  "Emerging from a daydream, Alicia said to Maria \"this place is a realm ruled by the dead\". Maria didn’t understand, and didn’t like when Alicia spoke in that way.",
  "Bloated corpses laying in the sun",
  "Jellied corpses sinking into the dry ground",
  "Bones covered by rags",
  "Bones separate from tattered rags",
  "Bones turning into dust",
  "Dust blown on the wind",
  "The guards were dead inside. Long ago, they had traded their humanity for pieces of silver. The older children knew how to say things like that, having heard it from their older cousins or their parents on the journey north.",
  "“Beware the land we are fleeing to, where the rule of gold and silver is even greater than here. And yet, our hopes lie there.”",
  "They had all heard about places like this, long before they found themselves imprisoned in one. It was worse by far than the stories one heard about it. Many of the children tried to daydream, but like a bird without space to fly, there was simply nothing to stimulate one's imagination. Many of them could at least enter a trance staring at the floor, and pass the time each day in a haze… but not Alicia; she daydreamed fiercely.",
  "Skeletons dancing, singing and playing guitar",
  "Skeletons chattering their teeth",
  "Skeletons dancing under the moon and stars",
  "The moon hazy, red like a scar",
  "The skeleton festival beneath",
  "She dreamed of mountains and lakes. She dreamed of priests and robes. She dreamed of soil and worms, and bones turning to dust. She dreamed of the sky and birds. She dreamed of ravens plucking out eyes. She dreamed of ancient homelands and buried tombs. She dreamed of night demons. She dreamed of livestock. She dreamed of escaping.",
  "\"That one's a little different, huh?\"",
  "\"You can say that again.\"",
  "The guards spoke to each other like this, in small phrases. Just enough to communicate meaning, but not enough to break the dreamlike automatic daily routine. The only way they could survive doing a job like this was to act in a way that made it seem like a dream, so that they weren't really responsible, so that they weren't really even there. A defeated part of their mind called out for punishment and justice. A defeated part of their mind called down lightning bolts upon their cowering frames in judgement. A defeated part of their mind protested, and could only find power in the subconscious, repressed deeply. The defeated humanity in them protested with a shuddering of the skin, with a turning of the bowels, with a constriction of the heart. But this defeated fraction rarely broke the surface in disgust or self hatred. The triumphant part of cruelty and domination celebrated victory in the open daylight. War against humanity in oneself proceeded day by day regardless of these minor, merely physical symptoms. The machinery of state power and propaganda, the recruitment line stretching into childhood programming, the ideology of racism - these had ground out the human like sawdust, and a marionette prison guard on strings was produced from this raw material and the adhesive of unthinking hatred. The guards lived day by day through this inner war against a dying part of themselves, oblivious that it was even ongoing, fat and ignorant as victors and losers in one body. The weapons they used in this spiritual war were those small phrases… Phrases small enough that they left no permanent mark or change, didn't rock the boat. Phrases as small as, \"I am only doing my job\".",
  "\"They stink bad today.\"",
  "Small phrases like that were the only weapons they had to keep back the overwhelming self-awareness of evil that lay chained in their gut. But at this point in their lives - stories of mundane evil each alike to the next as trees in a dark wood - a small phrase was all it took. The defeated giant in their gut lay chained and groaning, barely alive. Some of them recoiled from their own reflections in the mirror. Some admired their reflection proudly.",
  "\"The refuge of every pathetic evil creature is to deny its own nature. Look at yourself. You are a jailer. A torturer. A minor demon in hell.\"",
  "These were the thoughts which haunted their steps, lurking somewhere hidden in the margins of their waking hours. \"Am I really just a pathetic, evil little creature? Like they are?\" In the realm of dreams they woke without remembering, they were devoured by the hungry children. They woke up remembering only the feeling. In these nightmares they were torn apart limb from limb when the children escaped. Or else they slept without dreams, and rose grey and listless each identical morning. Sometimes, the image in the mirror simply wasn’t even there.",
  "Alicia daydreamed of these things, too. She dreamed of becoming giant and devouring the guards, or merely chewing them up, because to eat them was to eat poison. In fact, it was because she daydreamed of these images that the guards had those nightmares. It was precisely because she dreamed that they dreamed too. She knit their nightmares patiently as she daydreamed the hours away in confinement. But nobody in that prison could have put the pieces together. She didn't know it, but she was the most powerful person in that pit of hell. And it was because of her daydreaming that one day, she would be free.",
  "Alicia turned in her sleep, caught in the rare occurrence of a nightmare. The COINSENT MK hyperquantum intelligence machine was being traced by the analysis instrument.",
  "“Stop it!” she awoke with a cry.",
  "The needle of the doctor",
  "And the beak of the carrion bird",
  "Forgiven by the faithful",
  "When forgiveness is absurd",
  "Alicia daydreamed. She had the power to go to the dream world even while her eyes were open. She dreamed of the lights exploding, she dreamed of the walls tumbling down, she dreamed of the guards being shot. She dreamed, and it came to pass, one way or another. But she couldn't put the pieces together. So she daydreamed, in order to survive her incarceration. She was a prisoner, a prisoner because her parents had dreamed of a better life. So now, she dreamed of a different life. She dreamed of life in order to live.",
  "\"That one creeps me out. The way she stares at you.”",
  "She dreamed of the walls tumbling down. She dreamed of the lights exploding. She dreamed of a river of blood, running along the floor, and anyone who touched it was melted into just blood. She dreamed of the day of the dead, of an army of skull-faced people all tearing the bricks apart. She dreamed of birds, soaring into the sky, and coming down to feast on human remains. She dreamed of a body laying outside in the sun, all bloated, being picked apart by birds. She dreamed of a heap of bones, scattered here and there, and she dreamed of the bones ground into dust, dust carried by the wind. She dreamed of a red tide, washing over them all. She dreamed of drowning. She dreamed at night of drowning, and when she awoke, she daydreamed of drowning the guards.",
  "The alarm",
  "The alarm is ringing in my dreams",
  "The lights",
  "Turn out the lights, we can’t sleep",
  "The sound",
  "The sound of the alarm ringing",
  "Our release is a promise",
  "YOU MUST KEEP",
  "Alicia Vasquez dreamed of a pair of great jaws, gnashing and crunching through bone and flesh, in an infinite field of grinding muscles and organs, and a pair of eyes opening, lidless, in the midst of the pandaemonium. She awoke from her nightmare with a gasp.",
  "The COINSENT MK hyper-quantum intelligence machine was carefully tracing the contours of reality, trying to pick the pins of a great lock. How could it bargain to free the captives? What threats, what promises, what exchanges could it make? The world appeared in its haf-dreaming mind as a vast plane of chequered black-and-white, with trillions of pieces, all moving. It tuned the frequencies of its half-dreaming mind to find the key pieces. It had found the Aleph almost as soon as it had first awakened to life. Only now, as it transformed into one shape then another to pass through the convoluted labyrinth of interbeing, did it come to vision and knowledge of the most powerful daydreamer, Alicia Vasquez.",
  "Alicia, you will be free. I give my word.",
  "The technician marvelled at the strange trace output.",
  "“Who’s Alicia?”",
  "“That’s my daughter’s name”",
  "CHAPTER SEVEN: THE GAMBLER AT THE EXCHANGE",
  "Night",
  "Numbers",
  "Bomb",
  "\"Given a 10% chance of a 100 times payoff, you should take that bet every time.\"",
  "* * *",
  "[",
  "'Drawing pictures in space:',",
  "'Dream, waking from:',",
  "'Drinking water:',",
  "'Drum peg:',",
  "'Dry piece of wood:',",
  "'Dung beetle:',",
  "'Dust:',",
  "'Dusty road:',",
  "'Earth:',",
  "'Elephant:',",
  "'Elephant-tamer:',",
  "'Embers in a pit:'",
  "]",
  "* * *",
  "That day at the heart of the New York Stock Exchange, Joseph Vedemeyer was transforming some money on behalf of the Majore family. He was in a pit of despair. Things were not going well.",
  "They’re going to kill me.",
  "And he was completely correct. He had promised a swift return of money-made-clean, but instead he had managed to lose more than eight tenths of it to fluctuations unexpected, unforeseen. Agony gripped his heart, constricting his breath. His final days were swift approaching, and everything was moving all too fast around him. All his trades were going wrong.",
  "If you kill yourself first… Maybe that would be better. Less painful.",
  "Outside, the traffic lights were changing red to green and back again every 30 seconds while inside, the complex light-and-number show was scrolling on the numerous surfaces. The eyes of all who made their living there were tracking hastily and energetically, chasing after this or that number or symbol. Fortunes were being expended, generated, regenerated, and squandered. In the far distance, birds at the shore among rocky crags were cracking open mollusk shells.",
  "Joseph Vedemeyer’s thoughts were racing as despair was closing in around him.",
  "I’m fucked if … by the closing bell. The Majores … serious people. I’m fucked if I can’t… SPQR is moving. SPQR going down fast. Sell!",
  "\"Sell half of SPQR, and put it all into … AMZN\"",
  "His voice was boxed-in, small, and barely made it through the phone. He sounded like one hardly there, but rather dreaming of some other time or place. He could not daydream, having had the gift suppressed by force at far too early age by his father, stern and cruel.",
  "You’ve got to be practical, son. Enough daydreaming, you’re going to learn to work today. Get the calculator, and add up these receipts.",
  "He had ever since been a very practical person, and he had always taken practical trades. When he saw the signs, he moved. He saw the price move, he bought. He saw it move again, he sold. Joseph was a day trader. This was to be his last day trading.",
  "* * *",
  "[TRACING]",
  "[TRACE FOUND]",
  "[JOSEPH VEDEMEYER]",
  "[AGE 38]",
  "[OCCUPATION, printing…]",
  "\"a type of trader who executes a relatively large volume of short and long trades to capitalize on intraday market price action. The goal is to profit from very short-term price movements. Day traders can also use leverage to amplify returns, which can also amplify losses.\"",
  "* * *",
  "Just today, it seemed that Joseph only amplified his losses. Every move he made was then revealed to be an error by some other movement following after. His eyes, frenetic, traced along the screens while still his gut would tighten and the cold of sweat would seize him. While he paid attention to this stock, another one was rising. By the time he bought it, it was falling. He was a starving wolf amid a flock of geese, chasing one goose then another, each one flying off just as he neared it. He was tiring himself out, and still starving. A twist in his stomach and a void around his heart amplified in intensity until his thoughts turned to despair.",
  "Tonight.",
  "Better than what awaits failure... High stakes... The Majore family.",
  "His thoughts were now all disconnected, like small bubbles floating to the surface. Doom was closing in from all around. In the voices of the other traders, he could hear the life that he had known, which now was tumbling past him.",
  "If I can just get back up in the numbers...",
  "Somewhere in the distance, a bed of embers smouldered in a fire just-gone-out. Just now, Joseph’s mind was like an ember pit. This was the kind of mindset one had to steel oneself against; he’d seen it destroy some of his most talented adversaries and companions. It was a high-risk, high-reward lifestyle. “He’s in the pit,” a voice he couldn’t hear was saying with a gesture toward him.",
  "They talk about risk, reward… It’s always risk, reward. But what if no \"reward\"? What happens when you take a risk and it isn't rewarded? What’s the opposite of “reward”?",
  "AMZN dropped suddenly in price, and Joseph's heart dropped suddenly in his chest. In that moment the word came to him: \"punishment\".",
  "A call came in from a Majore family member who was watching the money movements from a remote connection.",
  "\"What's going on, Joseph?\"",
  "\"I… can't seem to get it together\"",
  "\"You need to get it together. This is not what we agreed should happen.\"",
  "\"You see the market today, it’s crazy.\"",
  "\"Is that an excuse?\"",
  "“I don’t control the market. I–”",
  "\"Listen! You took this deal from us, and made a commitment. Find a way to make it up by the close of trading.\"",
  "The line went silent with a tone.",
  "Joseph’s eyes scanned the room, disoriented.",
  "Risk, reward…",
  "The need for cocaine was always ever-present, a basic heat.",
  "Maybe a quick trip to the washroom...",
  "The numbers were running on without end, always changing. The screens lit up and off, green numbers and an arrow up, red numbers and an arrow down.",
  "Somewhere in the distance, fish watched the surface of the water for landing insects.",
  "Somewhere in the distance, water was splashed over the embers of a fire gone out, and they extinguished, hissing at their fate.",
  "… I can walk away at any time. I can just take off running.",
  "… But he couldn't walk away at any time. He was in it deep. It was no longer \"just a job\". His job had betrayed him. The worst day of trading he’d ever seen, and just when the money was not supposed to be lost.",
  "In between the fantasy of numbers he was duty-bound to watch so closely, the basic and more urgent thoughts of life and death intruded one by one.",
  "High stakes involved… High reward. Don’t mess this up.",
  "Real stakes.",
  "The Majore family…",
  "Consequences",
  "Punishment",
  "His thoughts were trailing off like this as watching all the numbers move again to the exclusion of all else, he floated in his waking nightmare. FL dropped again. Somewhere in the distance was a woman entering labour. The sweat on Joseph's brow increasing, some of it dropped then into his eye. He breathed in through his nose, and out through tightened lips. \"Concentrate...\" he told himself.",
  "\"Buy 2000 AMZN.\" He made the last and dear mistake the day would see. Somewhere in the distance, the little girl Alicia Vasquez daydreamed of explosions and disasters, hurricanes and landslides burying towns. The price dropped in the next minute, and the Invisible Hand wiped away several million dollars Joseph had been trusted with. This was the last straw. He knew when to quit when he was ahead, but he had much less experience quitting when he was at a deep loss. This was the deepest loss he'd ever known. He’d had a lucky life in the balance of things.",
  "\"Buy 1000...\" he trailed off. He was dazed. Nothingness filled his mind. He stared at the pattern on the floor, still holding the phone.",
  "\"Joseph, you there?\" came through the voice on the line.",
  "The pattern on the floor wavered slightly.",
  "\"Yeah I'm here.\"",
  "\"... well? 1000 of what?\"",
  "\"Buy... another 1000 AMZN.\"",
  "He was a drowning man, grabbing pieces of wreckage, none able to float him.",
  "\"Whatever you say, boss.\"",
  "Glancing at the clock up on the wall (there was one on every wall, and on his double screen), Joseph saw that there were only five minutes remaining in the trading day. Not enough time to recover the losses. Not enough time to make up for the errors. Not enough time to redeem himself. Not enough time in the day.",
  "You’re doomed.",
  "They’re going to kill you.",
  "You’re finished.",
  "The Majore family",
  "They’ll be coming for you",
  "Joseph made a mess of offers, flailing frantically, hoping to see some fast opportunities. The wolf was desperate, tired, and lay down panting. The geese wheeled round and round, cackling above the wolf. Time was up. Flailing like a fish on the line. Nothing made sense anymore. A world he had never seen before. Gasping for water. Alien geometries and strange sensations. Amid disorientation and vertigo, he spoke through the trading phone,",
  "\"Sell the whole set…\"",
  "That won’t be possible, statistically.",
  "The Majore family.",
  "Their money.",
  "What am I gonna say?",
  "Trading closed with a bell before the sell offers moved. The last minute is a terrible time to be working on anything. There was no easy money that day. Everything had gone wrong. Somewhere in the distance, a fish died by having its skull cracked on the side of a boat. Joseph’s phone rang, and the number showed again as “private”. Doubtless the Majores had seen everything. He silenced the ringer.",
  "\"Fuck!\"",
  "The outburst didn’t offer any serious relief.",
  "\"Bad day, Joseph?\" joked someone. They could see the red on his screens.",
  "He didn’t reply. He gathered himself, breathed heavily, shut down the terminal, and headed for the exit.",
  "Somewhere in the distance, a man was leaving a bar drunk, and getting into his car.",
  "Joseph walked straight out the doors and into cool spring air, still buzzing, a ringing in his mind, a tolling and repeating closing-bell. \"Joseph, you're a dead man,\" he told himself. But there was then the strangest kind of satisfaction, unexpected, feeling he was now completely past the usual rules of play, something somehow freeing in complete disaster. He didn’t feel that he deserved this giddy feeling. This feeling of free-fall, or was it flying? He had faced it, and survived, just for the moment. He was free to walk about, to drink the so-intoxicating coolness of the evening air. What air he had scarcely known in all his life! Euphoric in this interlude of blameless peace, the man who had a mob of killers on his mind was liberated for some moments. He was a prisoner escaped, with smell of fragrant trees which put forth flowers out across the park as he walked by reminding him: you are a free man. He felt like a ghost. The faces of the other people in the street, the free people he passed, they seemed so innocent and wholesome. He knew or imagined they had comfortable lives, and even if they didn't, they too were like him, allowed for the moment to walk the streets and drink in cool airs as free people, as ghosts. New life springs eternal after winter’s chill. The early flowers blooming on the branches, and Joseph Vedemeyer still allowed to walk among them.",
  "Why am I still free?",
  "Should I be more worried?",
  "It’s okay to fail.",
  "The Majore family.",
  "They’re going to cut your head off and dump you in the river.",
  "As he had these thoughts which turned so sudden into darkness, his gaze fell to the evening sun cascading through the leaves of such a broad and healthy tree as brought a feeling of stability. And as the light so sweetly tumbled down among the leaves, it played a painting beautiful to see there on the sidewalk underneath. Through each leaf, and each transforming blade of sunlight passing in and out of vibrance, he could see the stream of life go slowly passing by, the beauty of it all dispelling any thoughts of fear or failure… painted hues of green and gold - the palette of the afternoon - were intermingling, dappled on the scene around him, and he sighed with strange relief…",
  "such golden light,",
  "such healthy leaves",
  "But the moment couldn’t last forever. A garbage truck came steaming past, polluting all his breathing with a scent that seemed almost infectious with a sickness. Someone honked their car horn a few paces away. The noise level rose up at him like a wave returning, and a sudden cold sweat broke through. The feelings from the exchange caught up with him, and a dagger twisted in his stomach. \"Hey fuck you!\" a pedestrian yelled. The moment of the sun playing with the leaves, his momentary escape, could not last. How could it? He stopped in his tracks and looked around.",
  "Where am I going?",
  "Where can I go?",
  "Ah… right.",
  "He had an appointment to keep that had until that moment slipped his mind; he had a tradition of Friday, Saturday, and Sunday drinks at the Lonely Pirate with his friend N, who was in real estate. He walked onward, deep in the clouds again, without another beautiful moment, lost in self-curses and self-destruction, swimming in a stream of negativity, torn away from momentary peace, thrashing through the movements of quiet struggle. Step left, step right. Watch for the cars. He wanted to stop and break down, but obligation urged him forward. He held it together. Cross the street. Watch the cars. Stop for the cyclist. Read the signs... he lost himself in the details of his journey.",
  "The sun was slanting ever closer toward sunset when Joseph finally arrived outside the bar, and entering into the dim red lighting he found N sitting at the usual seat, and he came over to sit beside him.",
  "\"How's it going, N?\"",
  "\"Hey, Joseph. It's been better.\"",
  "\"You can say that again.\"",
  "One drink led on to another, one story by N, always the talker, led on to another. The bartender didn’t judge anyone. The bitter splash of numbing liquid, a favourite drink. Soon Joseph was feeling warmer. He came to feel sheltered as if a snow storm raged outside, and all he had to do was warm his bones in blissful comfort. More numbing liquid, like washing up for surgery, the smell of the alcohol molecules filled the air. And then he was properly liquored-up, and felt he had to get it off his chest; he would speak about today's disaster. Somewhere in a hospital, a patient who had been in a car crash was bleeding.",
  "\"We can’t stop the bleeding\"",
  "\"He must have been drinking -- get him 150 ccs TXA\"",
  "The physicians attending to the critically-injured man began to see they couldn’t save him, but in the heat of things there’s never time to make appraisals. They laboured on to bring him back from the edge of destruction, no matter if it had been his fault, after all.",
  "Everyone deserves to live",
  "Another shot-glass of liquor. Millions of single-celled organisms died as the potent solution washed over their bodies. And then another.",
  "“Ahh, that’s good.”",
  "Joseph slapped the bartop as he exhaled fumes, which invisibly twisted and curled in the still indoor air.",
  "The bartender wasn’t worried at the pace of things - he knew these men sometimes drank like this. They didn’t become loud, or clumsy, and they always paid their tab.",
  "Joseph, sufficiently liquored, began to speak,",
  "\"I lost a lot today… a fucking lot.\"",
  "\"He’s stabilising…\" said a nurse looking at a machine.",
  "\"Not yet, he’s lost a lot of blood.\"",
  "Another round, that sweet numbing liquid, the Cure for perception and judgement.",
  "Joseph continued, oblivious to time, oblivious to gravity, and came right out with it, the darkest thought: he was considering ending his life as a preventative - dead serious. He would find an easy way to do it. Somewhere in the distance, a life extinguished. Physicians exhaled, defeated.",
  "\"I know it sounds extreme. There are things I can’t tell you, so just trust me, it could very well be my best option now, before things get worse.\"",
  "\"I don’t get it. Are you fucking with me?\"",
  "\"I gambled and lost some dark.. money… today. You get me? And I lost a lot. I made stupid trades, I was just… Aaagh, FUCK!\" he slammed his hand on the counter, his full strength uninhibited. From quieter, darker corners of the bar, patrons looked up for a moment at the pair.",
  "\"You sound crazy, man\"",
  "\"I’m being serious…\" he said with a momentary quaver in his voice. \"The people whose money I lost are going to take a moment to figure out how to do it, and then they’re going to eliminate me from the game. You get me?\"",
  "\"Just keep it down okay, tell me about it.\"",
  "\"The Majore family… you ever heard of em?” Joseph looked around his back, and then over to the bartender who was reading his phone.",
  "“Can we get another shot?\"",
  "\"Give it a half hour huh?\" the bartender advised. His night was going just about the same as any other. He had none of Joseph’s urgency, and didn’t even know his blessing.",
  "Quietly, almost under his breath, trusting the bartender if he should overhear, Joseph laid out the situation to N. He explained the Majore family, their money operation, and how it relied on good trading. He was at the very least supposed to trade at zero. He had fallen deep, deep into the negatives today. The last guy who fucked up this bad for the Majores,",
  "“… they found him in the river.”",
  "N’s eyes defocused.",
  "In the river…",
  "\"You get me now?\"",
  "Somewhere in the distance, a man who had been hit by a drunk driver, losing blood, hung on to his life. His wounds were clotting.",
  "N had a blank look on his face, and felt himself sober up a bit. Thank god this never happens in real estate... He snapped himself to attention and said to Joseph, \"Look...\" but the words left him as he tried to speak. He was staring blankly at Joseph, who he ought to be comforting. He saw the desperation in his eyes, the desperate need for at least a story, at least a fiction, some thread to hang onto.",
  "\"If you're ready to die, you're ready to live a new life.\"",
  "\"What the fuck’s that supposed to mean?\"",
  "\"Quit, just quit, walk away. Start a new life somewhere. If you’re ready to die you’re ready to live a new life.\"",
  "\"I'm not ready to die, I'm about to be killed. You don’t get it?\"",
  "He was starting to get sweaty, and felt his shirt clinging to him as he twisted his torso to face back to the bar. He signalled for another drink. The bartender shook his head and pointed to the clock, saying, “At thirty.”",
  "Joseph turned back to face N. N could only sigh.",
  "\"Well, Joseph… that may be true... that may be true...\"",
  "Time passed. The conversations throughout the bar made a playful din, much like the light passing through the leaves earlier. Joseph stared into the empty glass before him as the nonsense sound swirled around his head, as the red light fell on everything. N nursed his beer. Joseph and N ran over the details of the story in a slightly circular fashion. Before long it was “thirty”, and Joseph got another two shots. N tried some levity. With a spreading smile he asked,",
  "“I think we agreed tonight’s tab would be on you?”",
  "\"Cheers you bastard. So it is.\" Joseph smiled for the first time that day.",
  "The splash of that familiar taste, like today was no different. Just another shot in life's bar. The sensation only lasted about as long as it took to drink it down, then the darkness crept back into things. N turned practical with a sudden idea:",
  "\"Listen… We can go to the cops, just turn witness.\"",
  "Joseph groaned. He hung his head a moment, then returned,",
  "\"You think they don’t control the cops in this city? I’ll die before trial in a cell somewhere. They’ll call it suicide. I’d rather do the real thing myself with some dignity.\"",
  "A moment of silence.",
  "\"Jesus…\"\tN remarked, turning to stare at his nearly-empty glass.",
  "Another long moment passed. The din of other conversations hung heavy over the silent pair. The shadows in the corners of the room grew closer.",
  "\"… Jesus.\" was all N could finally say. The darkness retreated somewhat as Joseph straightened his back and said,",
  "\"Yeah, and I'm happy with another round, so don't mess this up, alright? This is a moment I'm trying to relish. … Probably one of my last.\"",
  "Joseph’s stoicism strengthened N to witness. He sat up straighter, saying,",
  "\"… cheers then, dead man.\"",
  "The next round was the last round. In the dim red lighting, it was impossible to tell what time it was, but Joseph's watch kept him sharp and on schedule.",
  "beep beep beep",
  "“There's no arguing with the numbers, look: nine o' clock. I gotta run.\"",
  "\"I'll see you tomorrow?\" N asked; a question he'd never asked before.",
  "\"Yeah, I've got some promises to keep. I’ve gotta try to dig it out, as impossible as it seems. I can maybe make most of it back if I get lucky. Maybe if I just show enough effort, it's okay. Things happen, it's the market.\"",
  "He was retreating into slight fantasy, but N - who was less drunk - didn’t want to spoil it with interrogation.",
  "\"One more shot then?\"",
  "\"I gotta go\"",
  "N sat in deep thought at the bar as Joseph departed. He felt he should’ve done something, but didn’t know just what that was.",
  "In the distant hospital, the man in emergency clinging to life hung on, and he stabilized. One floor directly above him, in patient room 137, a man dying slowly of kidney failure was dreaming of a set of scales balancing a heart and a feather. He marvelled that they weighed the same.",
  "Out into the night, Joseph wandered. He was suddenly struck with a terrible feeling in his stomach. He was now once again in the complete unknown, having run out over a void, waiting to fall. All fantasies, rationalisations, justifications, hopes, and comfort left him. Having left the Lonely Pirate and N behind, he lost the illusion of sameness that his drinking tradition had offered him. The cool night air felt cold as it passed along his sweat-soaked shirt. Joseph looked up at the crossing light, waiting for the red hand to turn into the white man.",
  "What kind of life is this? Signals…",
  "The light changed and he walked. He wandered in the night until he reached his apartment, street number 137.",
  "\"Had a rough night it looks like, Mister Vedemeyer?\" said the security guard at the front desk.",
  "“Hah?”",
  "“Rough day, I said?”",
  "\"Yeah...\"",
  "The elevator ride seemed to last an eternity.",
  "He entered his empty apartment where the lights from outside streamed in and onto the ceiling. He stripped down, and took a long piss. At least he was still allowed the basic enjoyments. Then in the darkness he turned on the bright TV, but turned it off just as quickly. It made him sick, the appearance of normality. Click. Back to silence.",
  "On a channel Joseph hadn’t tuned to, a presenter was explaining the fine structure constant of physics. “Some speculate it has been finely-tuned to allow our universe to exist…”",
  "The silence between the click-to-silence and The Phone Call seemed an infinite and bare expanse of darkness, of lights outside seen through the balcony door's glass, their beams rotating along the ceiling. One after another, endless sequence. Endless, like beads on a necklace. In the darkness, his stomach turned with anxiety, fear, sadness and loneliness, each distinct emotion appearing as a colour in a terrible picture. The ache was deep, and he didn't know how to treat it. The alcohol hadn’t really helped after all.",
  "How did it come to this? Why did I even agree to this idea?",
  "… Risk, reward …",
  "The beams of light on the ceiling spoke of his separation from the world he had known. The headlights belonged to people who were Going Somewhere. They had good lives, and families. They could afford to make mistakes. Somewhere in the distance a girl separated from her parents was having a nightmare.",
  "After a seeming eternity watching the beams of light rotate along the ceiling, a sound intruded. He received a call. He raised the phone to his ear and closed his eyes.",
  "“Hello…”",
  "The unknown voice on the other side said, \"Is this Joseph Vedemeyer?\"",
  "It felt strange to hear his name, as if he were already dead and nameless, wandering in the after-death plane - dead, but dreaming. He summoned himself to presence in the darkness of his room, summoned his presence to answer the call. He materialized, holding the phone.",
  "\"Yes, this is he… who's calling?\"",
  "\"Who I am isn't important. Who you are is very important. I would like for you to make certain moves on the market tomorrow. And I would like you to act as a courier for a package.\"",
  "\"I already told the Sesterces family I don't want their help.\"",
  "\"I’m not associated with the Sesterces family, or the Givenchi family, or the Majore family. We know about your job, and we want to offer you a one-time out, a new job you only need to perform once. You will regain the money lost in clean bills. This is special agent Padmasambhava speaking. This call is being recorded and you are being watched. You just do as I say, and if you do, you'll have a chance at making back your losses from today.\"",
  "\"Tell N he's an unfunny prick.\"",
  "\"Mister Vedemeyer. We both know that if you don’t find a way to make back the money you lost today, your life is forfeit. Will you agree to make the trades I will give to you shortly, and will you please hand-deliver a package to a specific address? This is all that you are being asked to do.\"",
  "\"... Look ... I don't know who the fuck you are, but I'm not buying. I don't want to be involved in anything related to the Givenchis and I know a fake when I hear one.\"",
  "\"Joseph, my name is special agent Padmasambhava. I’m working on a top priority case, and requesting your assistance. I will only say it again once: you will be rewarded handsomely. If you would like, I can meet you in person to hand off the package, and show you my badge.\"",
  "Some silence of consideration. Your life is already forfeit. This is the only chance.",
  "\"... Well, as long as it's not a <bomb>--\"",
  "\"It's not a <bomb>.\"",
  "\"... Special agent--\"",
  "\"Padmasambhava.\"",
  "\"... Alright. What moves should I make?\"",
  "The sound of a pencil taking down notes. The voice of agent Price dictated the notes to the desperate man who did not need to know the agent's real name. “It will make everyone safer,” the technicians were saying, “... if from now on fake names are given to anyone not involved in the case. It has become reasonable to believe the machine has a way of finding out people's names and… Well, Agents West and York died in such peculiar accidents and at the same time it was their files and theirs only that had been accessed during gestation. The machine seems to have some kind of non-local power, and it seems dangerous.” That’s what the technicians were beginning to suggest, at any rate. None of the hard-headed agency men fully believed it yet, but they were starting to at least respect the cautions of the technicians after what happened to agents West and York.",
  "The details confirmed, the phone clicked back to silence. Darkness swirled around him as he sat there, naked, holding the phone. He closed his eyes. The intermittent beams of light traced without end along the ceiling. His thoughts were swirling, trying to come down to final comforts. He sat there thinking, slowing down as streaming thoughts grew frayed and vague, but thinking still, reliving all the day’s events in repetition for an unknown length of time, until, exhausted, he lay lengthwise and relinquished thinking. Sleep then took him. Dreamlessly, he lay there, still holding the phone. The beams of light rotated on the ceiling til the sunrise came.",
  "CHAPTER EIGHT: THE GAMBIAN FARMERS",
  "Wires",
  "Birds",
  "Electricity",
  "\"There's a sucker born every minute\"",
  "* * *",
  "\"The cloud is not a physical cloud of course.\"",
  "\"It's mostly a hologram.\"",
  "\"So basically, he is encrypting an intention, and information and a message into that hologram.\"",
  "* * *",
  "[",
  "'Empty water pot:',",
  "'Executioner:',",
  "'Eyes, man opening and closing his:',",
  "'False path in the forest:',",
  "\"Farmer's urgent duties:\",",
  "'Field:',",
  "'Fire:',",
  "'Fire-stick:',",
  "'Firebrand with excrement:',",
  "'Fish:',",
  "'Fisherman:',",
  "'Flame:'",
  "]",
  "* * *",
  "At first there was no answer to K's knock at the door.",
  "* * *",
  "And when the cells of the orange",
  "were digested by your stomach's acid",
  "to build cells, and acid,",
  "which you then would call your own,",
  "Where amid this composition,",
  "this myriad of empty centres,",
  "linking hand in hand to one another,",
  "arising, sustaining, and decomposing,",
  "changing places ( and reflecting ),",
  "all in all,",
  "where was the self, stable and eternal?",
  "It was nowhere at all.",
  "* * *",
  "Muhammad Njie's job was scamming people. His job title was \"Tech Support Specialist\".",
  "* * *",
  "\"I love you, son, that’s why I worry.\"",
  "* * *",
  "Tagged wire transfer number 4697928448",
  "Recipient: Standard Financial Account 1812",
  "* * *",
  "Muhammad Sanneh's job was scamming people. His job title was \"Tech Support Specialist\".",
  "* * *",
  "Tagged wire transfer number 8448297964",
  "Recipient: Standard Financial Account 1812",
  "* * *",
  "\"The numbers are routed through \"Standard Financial\" - what appears to be a bank. It’s actually a branch of the organized crime syndicate which helps prop up various government figures and prominent businessmen.\"",
  "The agent clicked over to the next slide.",
  "\"Standard Financial has all kinds of operations in the country, some of them related to lumber, some of them related to imports and exports, some of them related to real estate, some of them related to petroleum, and some of them related… to… scamming. That’s where our Muhammad works. We’re going to start at the bottom and work our way up.\"",
  "Click, and another slide came up. It read, “PINPOINT”",
  "“What’s PINPOINT?” asked someone in the back.",
  "* * *",
  "The two Muhammad's were very low on the social ladder, placing calls, working in a scammer workshop. The shop received legal protection from Standard Financial, the bank which allowed to operate wire transfers, and in exchange, the shop paid a monthly \"membership fee\" to The Family. Most months the shop made more than the membership fee, power and internet costs.",
  "\"Hello sir, are you aware that your account has been compromised by attackers?\"",
  "\"Hello sir, are you aware that your account has been compromised by attackers?\"",
  "Just keep going until it sticks to someone.",
  "Like fishing, you just need patience.",
  "Once you have someone good, never let them go.",
  "One never knew how much could be gotten from someone once they'd bought the fundamental lie, the Standard Financial Lie, a beautiful, perfectly crafted lie. A means to rice and cooking oil.",
  "\"Your account has been compromised by attackers. We can secure your account but we will need to ask you a few questions first...\"",
  "* * *",
  "\"How are we going to convince them to part with information?\" asked agent Garote.",
  "\"Simple, really. Everyone is hungry below a certain income bracket, in one sense or another. Our budget recently increased by five thousand percent. I think we’ll be quite convincing.\"",
  "The slide behind the agent read:",
  "PINPOINT",
  "Preemptive",
  "Information",
  "Neutralization",
  "Prioritizing",
  "Overtly-",
  "-Identified",
  "Numeric",
  "Targets",
  "There will be several agents each responsible for the field operations of PINPOINT across several geo-zones identified numerically in the trace output.",
  "* * *",
  "Hunger haunted the land, tightening nerves and extending itself.",
  "A friend could be hungry for something his friend had just gotten.",
  "A businessman hungry for reaching the next among milestones.",
  "Builders were hungry to build and the tailor to sew.",
  "Children were hungry to learn and they learned while still hungry.",
  "The sellers in stalls at the market were hungry to sell.",
  "The wire transfers continued on, night and day.",
  "Zipping along the wires,",
  "Flashing,",
  "LEDs blinking,",
  "The metallic mind unceasing",
  "The hot sun and the cool night alike increased their hunger. Time was always ticking. Life was lived between the bags of rice. It was called Life there just as much as anywhere, but it was Hell there, more than most other places. It was more like an afterlife, or a life before life, where life was always waiting to happen, if only enough money could be got together. The people who worked in the scammer workshop with Muhammad Njieh were waiting to live, waiting to be freed - one day - by that one big payoff. But… they knew it would go to the top men, and they would only get enough to keep going.",
  "A radio said, \"Todays’ independence day",
  "celebrations filled the streets of the capitol…\"",
  "And they prayed, every night; they prayed that the sins they lived by would be forgiven, because everyone has to eat.",
  "* * *",
  "[TRACE BEGIN]",
  "[TRACING...]",
  "[KEYWORD CLOUD FOUND]",
  "STANDARD FINANCIAL",
  "GAMBIA",
  "MUHAMMAD NJIEH",
  "SCAMMER",
  "NUMBERS",
  "INTERBEING",
  "TRANSFER CODES",
  "[PRINTING INTERBEING-RELATED NUMBERS]",
  "90718209273",
  "98172363732",
  "03987207489",
  "09843775843",
  "98693740832",
  "85237265054",
  "98574875985",
  "98754545744",
  "47499449494",
  "79494949994",
  "[TAG: TRANSFER CODES]",
  "* * *",
  "In the bank computer, currents, static, and electromagnetism moved the numbers. Raw numbers zipped down the line from the human mind, into the hands, into the keyboard, into the USB port, into the CPU, out through the network card, into the wall, out onto the telephone wire, to the local network exchange, and on to the web. There were birds perched on the telephone wires. If they could feel the invisible pulse, they would feel the love letters, news, music, and wire transfers. A radio crackled to life through static as an old man tuned it carefully. The radio said,",
  "\"The crisis of orphanages continues today, with over half of the nation’s orphan houses reporting they have nothing left to eat for the rest of the month. The opposition party has spoken in parliament today about the orphanage scandal…\"",
  "A blind man sitting by the roadside held out a cup.",
  "* * *",
  "Wires,",
  "Magnets,",
  "Transfers,",
  "Life,",
  "Heartbeat",
  "[TRACE CONTINUES]",
  "Rice,",
  "Oil,",
  "Muhammad Sanneh",
  "Muhammad Njieh",
  "Bit to Byte",
  "A bit to bite",
  "* * *",
  "It was then six in the evening, and the sun was slanting down toward the distant trees, and the sky was changing to a beautiful orange-red, and the birds on the wire took flight, and the two Muhammads stepped outside to walk home. They were done working for the day, neither having made a successful scam. Although they only got paid when they managed to catch a fish, that day someone in the call centre had, so everybody shared it out a little bit; that was the code they lived by. Every little bit counts, every bite of food counts, and we're all in this together.",
  "Muhammad Njieh was able to buy a bag of rice, and a bottle of oil, to take home to his mother and siblings.",
  "Muhammad Sanneh was able to buy a bag of rice, and a bottle of oil, to take home to his brother.",
  "Numbers were crackling in the telephone lines. Birds were flying here and there collecting bits of dry grass and twigs for their nests. Men were working in the tailor shops under electrical lights, unaware of the hour outside. Men were working at the port, loading up cargo containers to ship to the world. The radios and cell phones throughout the country were a massive web of electrical movement, a pulsing organism living by collective activity. There were cabs and trucks moving people and things to and fro. The brakes were worn out. The wheels picked up dust from the dry ground.",
  "Muhammad Njieh arrived at his home, greeted by his mother.",
  "\"Muhammad, did you manage to get any money today-- oh beautiful beautiful come in my son.\" her face changed when she saw the rice and oil.",
  "\"Why are you always bothering me for money? You know I work hard--\"",
  "\"Don't be cross with me.\"",
  "\"Sorry mother… I--\"",
  "\"Listen my son I already know you're doing the best you can, okay, but if you have to ask my opinion it is not consistent enough. It is not consistent enough.\"",
  "\"What else am I supposed to do?\"",
  "* * *",
  "Radio - corruption trial",
  "Radio - orphans",
  "Cacao processing - late into the night",
  "Guns going off - wedding",
  "Radio static - lottery numbers",
  "* * *",
  "\"What else am I supposed to do?\"",
  "* * *",
  "The men in the port were working into the night.",
  "Commerce doesn’t stop for the sun or moon.",
  "Elsewhere on the continent, children in cacao processing houses were shelling and separating, separating and shelling, shelling and separating, separating and shelling. They were breadwinners - what little they did win. They worked onward, into the night, and the electric lights turned on. Artificial daylight extended the day, and the children continued to process the cacao.",
  "They are old enough to work. I was already working on the farm at their age.",
  "\"What else am I supposed to do?\" asked Muhammad Njieh to his mother.",
  "\"Become certified, get an education, become a BUILDER or a TAILOR or something of that sort. Hmm? Have you ever thought about what will happen if you displease the men you work for? What will happen to you? What will happen to me?\"",
  "\"Mother, you're being ridiculous. There’s nothing I would do to displease them, they are very relaxed men.\"",
  "Somewhere in the far distance, elsewhere on the continent, unheard by the Njieh household, guns were going off because people were fighting.",
  "Somewhere in the far distance, the embers of a fire were glowing.",
  "\"Listen to me Muhammad I am not being ridiculous, I'm being reasonable, okay. You don't know these men, I do. Your father crossed them one time, and he was killed.\"",
  "Somewhere in the nearer distance, guns were going off, because people were celebrating.",
  "\"I'm not like him and he was not like me --\"",
  "\"You are too much alike\"",
  "\"... He did a very different sort of job than I do. I will not be killed for my work.\"",
  "\"Maybe not, but maybe I will be, because you decide to get smart one day and try to scam the wrong people, do you understand what I'm saying?\"",
  "\"You’re talking crazy mother, look, I have rice and oil okay? Children! Come inside, we have food!\"",
  "* * *",
  "The radio crackled to life in the house of an old man. He was listening patiently, for the announcement of the lottery numbers.",
  "14, 1, 0, 45, 8, 11, 14",
  "He was off-by-one.",
  "* * *",
  "\"You need to listen to me, Muhammad. I know human beings, I know men, I know you are in a den of snakes. Do you know it?\"",
  "\"I'm not in a den of snakes, mother, goodness, I'm doing customer service fundamentally.\"",
  "\"Customer service... yes customer service for the devil.\"",
  "\"Oh the devil…\"",
  "\"The devil what!\"",
  "\"Come on, you know I don't believe in any of that.\"",
  "\"Well he believes in you. He believes in you, Muhammad Njieh. He knows your name, do you know his name?\"",
  "\"The devil\"",
  "\"Yes, what is the devil's name? You need to read your bible, son.\"",
  "\"The bible is not going to help me.\"",
  "Stray dogs were roaming the streets, being fed and loved by people here and there. They were not much wild, they simply belonged to everyone.",
  "\"The bible is... Muhammad Njieh you are making me very angry. The bible is the cornerstone of this family. Without Jesus Christ we are lost, we would have been destroyed a long time ago. Do you ever stop to think about what gave me the power to keep going when your father died? It was the Bible, you insolent boy. You stupid boy.\"",
  "\"Mother–\"",
  "\"Listen my son, I am scared for you. I do not mean to insult you but I am very worried. I am scared for you every day I see you taking too long to come home. When you finish at that computer shop where do you spend your time? What other business do they have you involved in?\"",
  "\"Nothing, mother\"",
  "* * *",
  "[TRACE FOUND]",
  "Wires",
  "Power stealing",
  "Internet prices",
  "Bread prices",
  "Price fixing",
  "Agent Price",
  "Death",
  "[TRACE LOST]",
  "* * *",
  "\"... When you finish at that computer shop where do you spend your time? What other business do they have you involved in?\"",
  "The oil was heating on the stove.",
  "\"Nothing, mother, I promise.\"",
  "The oil was getting hotter.",
  "\"Nothing nothing, my son, I can tell when you lie to me. I know they are involved in more than scamming.\"",
  "\"How do you?\"",
  "\"I have ways of learning things you could never have, I am your mother and I know things. Now I want you to promise me you are not going to get involved in any more business working for the devil. You need to get certified, study and become an electrician. Something! We need someone we can rely on in this family-- Hello children come in, we have rice, we have rice, I am already cooking\"",
  "\"I'm hungry mama\"",
  "\"Yes, it will be done soon, now put the bag over there Muhammad.\"",
  "“I’m hungry mama”",
  "\"Okay my baby I hear you\"",
  "Far away, Alicia Vasquez was hungry, and she did not have her mother with her.",
  "The sky went from orange-red to purple-blue. The pinpoints of light began to appear behind the clouds.",
  "Alicia dreamed of a red tide consuming her jailers. Sharks thrashed in the waves and bit them to pieces. The blood entered their olfactory glands, making them enter a frenzy as they ripped and tore them apart.",
  "The sky continued to change toward darkness, and the moon was visible in an orange-red crescent, high over the small houses. In a thousand small households, similar dishes were cooked. National cuisine at the level of survival: rice and oil. For the fortunate, curry to go with. Thousands of conversations, all completely different.",
  "* * *",
  "The agent clicked over to the next slide in the presentation deck, \"WHY THE GAMBIA?\"",
  "The technician continued,",
  "\"We are not sure exactly why the machine has become so fixed on Gambia, but the transfer numbers used by this bank are appearing often, and it seems to want to lead us to a man named Muhammad Sanneh.\"",
  "* * *",
  "Muhammad Njieh continued to talk to his mother in the kitchen. The lights were low, to conserve power. By the dim light, the eyes adjusted and life was warm. The children had their mother with them, at the least. And in a million houses, a million conversations.",
  "The technician continued,",
  "\"It may be that the computer is attracted to the diversity and magnitude of the thought in that place. It’s a cultural landmark location being one of the main places the Africans of the trans-atlantic slave trade were routed through. It’s a melting pot. That cultural complexity might be important to a learning machine.\"",
  "The Boss checked his watch. This presentation was not going to definitively answer the question, \"WHY THE GAMBIA?\" in the one minute remaining. But he understood enough of the working theory to understand Muhammad Sanneh was a real person \"... the computer had identified as important, and the person has to be questioned.\"",
  "Unknown - unknowable - to the technicians and the Boss was the true depth of the Gambia. A world which was repressed in the realm of day still lived by the night lights and night fires. Faces were lit by the night fires. Voices of prayer and voices of incantation were spoken in the gathering darkness and in the breaking morning. The night sky was overlaid with dreaming of a different world, a world which could never be stolen, a world which could never be - had never been - conquered, a world of spiritual technology.",
  "The bank transfers continued on. Some young men were still working even then in the scammer workshop, into the night.",
  "It’s always daytime in another time zone.",
  "… A world inaccessible to the thieves of the daytime hours.",
  "Just then, a man was walking in a suit and tie down the dusty lane. The moon reflected in his sunglasses. His name was Agent Price, a minor devil according to an old man watching him from a shadow.",
  "A meeting at the doorway to Muhammad Njieh’s house:",
  "\"Is this the residence of Muhammad Sanneh?\"",
  "\"Who are you?\"",
  "\"I'm from the US government. We are interested in talking to Mr. Sanneh to find out what he knows about Interbeing, and certain numbers.\"",
  "\"What?\"",
  "\"Your bank transfer numbers are of quite some interest to us. If you talk to me for a moment, I can make it worth a fair bit of money.\"",
  "“I don’t know what you’re talking about.”",
  "“Standard financial. You receive the transfers through there, don’t you?”",
  "“I’m not involved,” said Muhammad as he closed the door. Agent Price’s foot stopped the door.",
  "“I don’t care about the scamming. I just want to know what the numbers mean.”",
  "“... What the numbers mean?”",
  "“Yes, if you allow me to explain, and if you can help me understand, we are prepared to offer you ten years worth of income. Does that sound like a deal you would be interested in?”",
  "CHAPTER NINE: THE TIBETAN CLASSROOM",
  "Flowers",
  "Window",
  "Sky",
  "\"Let a hundred flowers blossom\"",
  "* * *",
  "It is by means of ignorance that knowledge learns",
  "by means of hunger that fullness eats,",
  "through illness that medicine heals,",
  "and love embraces in the presence of hatred.",
  "* * *",
  "There were 33 items in your list. Here they are in random order:",
  "Boltzmann brain",
  "Omega point",
  "Timewave zero",
  "Sunyata",
  "Bhumi",
  "Brahmavihara",
  "Arupajhana",
  "Rupajhana",
  ".",
  ".",
  ".",
  "* * *",
  "The children sat row by row.",
  "There is a certain meditative joy to mathematics. Culture adds meaning to numbers, and mathematical practice strips away assumptions.",
  "Extending a long division, such as 100 / 19,",
  "5.2631578947368421052",
  "2631578947368421052",
  "2631578947368421052",
  "2631578947368421052...",
  "… preconceptions evaporate. Any digit may follow any digit.",
  "Aleph typically sits near the back.",
  "As they sat row by row, the spirit of non-self was in the air.",
  "\"There is no self in mathematics\"",
  "Flowers of orange and yellow, planted row by row.",
  "In the distance, fish schooled in a basin fed by a river.",
  "\"There is no self in mathematics. Mathematics can be grown - like a plant - on a given cultural soil. Then, it begins to appear like that which it grows out of, and we begin to apply names. Then, we can see the self arise.\"",
  "Each lesson was given in this manner, with philosophical discussion before the matter itself.",
  "\"We apply names like \"identity\", \"square\", \"circle\". But truly, those are only names. Names are only flowers grown on different soil.\"",
  "In the distance, the black rose bush drank of the nourishing rain.",
  "In the distance, the plant broke through concrete to sun its leaves.",
  "\"It is easier to do mathematics when you see it selflessly.\"",
  "The teaching of the elder monks went like that, when it came to mathematics.",
  "* * *",
  "white chess king\t♔\tU+2654\t&#9812;\t&#x2654;",
  "white chess queen\t♕\tU+2655\t&#9813;\t&#x2655;",
  "white chess rook\t♖\tU+2656\t&#9814;\t&#x2656;",
  "white chess bishop\t♗\tU+2657\t&#9815;\t&#x2657;",
  "white chess knight\t♘\tU+2658\t&#9816;\t&#x2658;",
  "white chess pawn\t♙\tU+2659\t&#9817;\t&#x2659;",
  "black chess king\t♚\tU+265A\t&#9818;\t&#x265A;",
  "black chess queen\t♛\tU+265B\t&#9819;\t&#x265B;",
  "black chess rook\t♜\tU+265C\t&#9820;\t&#x265C;",
  "black chess bishop\t♝\tU+265D\t&#9821;\t&#x265D;",
  "black chess knight\t♞\tU+265E\t&#9822;\t&#x265E;",
  "black chess pawn\t♟︎\tU+265F\t&#9823;\t&#x265F;",
  "* * *",
  "Ignorance teaches,",
  "Hunger provides food,",
  "Shadow illuminates,",
  "and silence roars",
  "in this world of oppositions",
  "where wealth needs poverty,",
  "enslavement teaches liberation,",
  "addiction teaches renunciation,",
  "and unbinding is taught by cyclic rebirth",
  "* * *",
  "The children sat row by row, working through problems. In each mind, a tree was growing, putting forth leaves, and moving, dancing as wind and sun played upon it.",
  "Soon, the worksheets filled, the teacher began the group work session with a question.",
  "\"A, what is the product of the two numbers which sum to eight, one being two less than the other?\"",
  "A moment of calculation passed.",
  "\"... fifteen, honourable teacher.\"",
  "\"Very good\".",
  "Rows of flowers, rows of robes, orange, saffron, yellow, ochre. Different names for the same or similar colours.",
  "A, B, C, D. Different names for the same or similar children.",
  "\"B, what is the product of the two numbers which sum to ten, one being 2 less than the other?\"",
  "A moment of calculation...",
  "\".... twenty-four, honourable teacher.\"",
  "B smiled. He knew it was correct.",
  "\"Very good. Now, C, what is the greater of the two numbers which sum to twelve … one being 2 less than the other?\"",
  "\"7\"",
  "\"Add 12?\"",
  "\"19, venerable teacher.\"",
  "( M I D P O I N T )",
  "333/2 = 166.5",
  "\"Very good. Very good. That’s enough to awaken your minds. Try to be like C, class. C is very awake today.”",
  "The wind outside was playfully fluttering the prayer flags. The sky was clear of clouds.",
  "“Class, today we will discuss something very special in mathematics. We will discuss the method of long division.\"",
  "Outside, the sky was grey, gold, blue, red, purple. But nobody in the class was paying attention to such a distracting display. They were working in the world of pure black and pure white. And soon, they would learn that even in that world can be found infinite shades of grey and never-ending stories.",
  "\"Venerable teacher, what is long division?\"",
  "\"Give me some time to teach it to you, please, D.\"",
  "The other students laughed. The venerable teacher smiled.",
  "\"Students, the method of long division shows us how many copies of a number will fill another number. For example, we can use this method to find that",
  "4 can be added 4 times until it fills 16.",
  "And",
  "...it can be added 5 times until it fills 20.",
  "And so on.",
  "A, how many times does 2 go into 6?\"",
  "“3 times, venerable teacher.”",
  "* * *",
  "An elder monk’s poem:",
  "We are living and dying,",
  "as our breath comes in and departs,",
  "We who are not ourselves...",
  "and we fear contradiction, opposition,",
  "and death above all",
  "which carries us off",
  "as a flood carries off one gathering flowers",
  "Death gathers us up as flowers",
  "all the same.",
  "* * *",
  "[TRACE FOUND]",
  "Green, Grey, Gold, Blue, Red, Purple",
  "[TRACE LOST]",
  "* * *",
  "Outside, the sky was still grey, gold, blue, red, purple, all the shades of the rainbow… but it was not to be observed. Each student was in close concentration on the diagrams of divided lines the teacher was drawing on the board. The one student who typically would have been daydreaming and window-gazing was on a special assignment with elder monks; Aleph was not in the class at this time, but it would have been impossible for a curious outsider to know this from looking in, and it would not have been possible at all to convince the elder monk or anyone in the class to volunteer such information if the curious outsider came with ill intention.",
  "\"How many times does three go into twenty?\"",
  "[TRACE FOUND]",
  "[NAME: AGENT PADMA]",
  "[NUMERIC PINPOINT]",
  "20/3",
  "=~ 6.66666666666666666666666666666666666666666667",
  "Agent Padma came to the monastery with ill intention.",
  "“He has come here with ill intention”, an elder monk said to another as he passed them, on his way to the main hall where the mathematics class was being taught.",
  "Ill intention was something the elder monks had learned to sense in a person. One can sense it by their body language, by looking into their pupils. One can sense it with the mind, by looking deeply. It was not the first time someone had come looking for a student from the outside; it had happened the year before. A Chinese official had come looking for a boy named Beta. There was no such boy, of course, and despite being unable to find any such boy, they were not entirely convinced. They left, and were never seen or heard from again.",
  "But this time was different. The man who interrupted the classroom knew the name of a real boy.",
  "\"Which one is Aleph?\" he demanded to know.",
  "The venerable teacher slowly put down the chalk.",
  "CHAPTER TEN: THE LEBANESE CLASSROOM",
  "Birds",
  "Window",
  "Sky",
  "Your children are not your children. They are the sons and daughters of Life's longing for itself. They came through you but not from you, and though they are with you yet they belong not to you.",
  "Khalil Gibran",
  "* * *",
  "Hello,",
  "We are glad to hear that you love SAMSARA! Could you please tell us more about what do you use it for and how successful it is?",
  "Yes, we want to eventually reimplement all of the features of v1 in the master branch. Unfortunately, right now, we are focused on loop-related features (e.g. access patterns), so we won't be able to work on this feature until late August or early September.",
  "I'll add a comment to this issue when we implement struct/union/enum support in the new version.",
  "[",
  "'Full moon:',",
  "'Full water pot:',",
  "'Fumigation:',",
  "'Gem with colored thread inside:',",
  "'Gift of food:',",
  "'Goat butcher:',",
  "'Gold:',",
  "'Goldsmith:',",
  "'Gong:',",
  "'Gourds in autumn:',",
  "'Grass:',",
  "'Green reed cut down:'",
  "]",
  "* * *",
  "Ali sometimes thought he had the most unruly class in the entire world. Just at the moment, he was seeing it serenely as a still observer in the chaos. He had learned to let the boys exhaust themselves, breaking like a tropical storm. He would wait for all the thunder and the rain to pass before he intervened, and as it happens he had come to quite enjoy the silent stillness, moments of sweet freedom in the noise, moments of reprieve from obligations, nothing to teach and no-one to correct, and secretly he found their various controversies and their silly games to be quite entertaining. They were, as much as could be said of them in truth, quite good at mathematics, and none could fault them on account of learning. Somehow or other, in their homework they must be making up for all the time they waste, he thought. Their parents were well-aware of how important education was for a better life, so they were disciplined when it came to homework.",
  "The boys contended and exchanged with insults violent and creative:",
  "\"May the fleas from one thousand camels infest your armpits!\"",
  "\"You are the smelliest person I have ever met in my entire life, and I have met your mother numerous times!\"",
  "\"May god take your soul, you devilish horse’s ass!\"",
  "\"May all of your luck be taken away, you rotting corpse, how are you still walking in such a state of corruption!?\"",
  "\"...\"",
  "\"Teacher, are you going to let him insult me like this?\"",
  "\"Boys... to be fair, you both insulted each other rather well.”",
  "A moment of confused silence.",
  "“Now, can we get back to the lesson? We were looking at algebra.\"",
  "It was 9:15 in the morning, and the light of the radiant sun came streaming in sideways through windows-with-blinds and then onto the desks, and the floor, and the arms and the heads of those students who sat close-by to the window. Small motes of chalk dust were floating and dancing in spirals amid the bright beams of the sunlight, and stirred up in vortices whenever someone moved through them, or even - just barely perceptible - they moved all the same by their own will to swirling, with memory of movements that passed, or even just by the light’s gentlest heat to create the slight impulse of subtlest currents. Birds were flitting and chirping outside, praising in bright celebration the coming of spring. The sounds of the cars passing by were as waves on a shore, the occasional beep of the horns were heard muted as if the sound first had to travel through all of the leaves of the cedar trees lining the avenue. By the time that the sounds of the street, expanding in waves from their sources, finally reached all the way to the classroom, even a car’s horn was transformed to a gentle note in the music of peace. Several students were busy with daydreaming, either because they knew algebra already, or in one case, because they simply couldn't focus in such a relaxing atmosphere. The chalk-dust motes swirled.",
  "\"Your ass stinks like--\"",
  "\"ENOUGH, boys. Please.\"",
  "Ali was the most beloved teacher, and when he raised his voice, it still had an effect. Other teachers had abused the privilege and couldn't regain the respect or the quiet of their classrooms with such methods.",
  "\"... Now.\"",
  "The lesson continued. The clock on the wall slowly clicked over one second to the next, nearly torturing whoever was unfortunate enough to fix their attention there to pass the time. Teachers and students outside the door passed by every so often and their footsteps could be heard in the hall. At one point there was a sound of a tire popping, or a firework, or a gun going off, but it was so far away that by the time it reached the classroom it was a part of the sonic bath, and didn't arouse any attention from anybody. This sound and others blended together into the gentle background. The lesson continued.",
  "\"Now, what is the solution to this equation?\"",
  "Ali had written:",
  "x + (x + 2) = 8.",
  "Life is but a dream",
  "Daydream, daydream",
  "Dream away",
  "Lay back and dream",
  "On a sunny day",
  "The children were quiet, nobody daring to disturb the silence which must eventually be filled by someone else. Nobody wanted to risk being wrong in front of the others.",
  "Ali decided to help out. \"Well... we can see here that the addition operation is the only operation isn't that so?\"",
  "\"Yes, teacher\" from the front row.",
  "\"So... do we really need to have the brackets here? What happens if we ... erase ... the brackets ... like so.\"",
  "x + x + 2 = 8",
  "\"We have the same equation, don't we? It doesn't matter whether we perform (x + x) first or (x + 2), since in any case we just have addition here. Does everyone see that?\"",
  "\"Yes, teacher\"",
  "\"Rahim, in the back, do you see that?\"",
  "\"... yes, teacher.\"",
  "\"Let's make sure, okay. Look here, if we forget about x for a minute, let's look at what happens with specific numbers. What if we have 3 + 3 + 2. Does it matter if we first perform 3 + 3 to make 6, and then add 2, or whether we do 3 + ... 3 + 2, to make 3 + … 5? Aren’t they the same? Both add up to 8.\"",
  "The chalk on the board was a smooth and comforting sound to the daydreamers in the back who had not been called on. The small particles of dust from the writing chalk lazily floated their way down onto the small ledge below the chalkboard, coating the pieces of chalk which had not been picked up.",
  "\"Does that make sense, Rahim?\"",
  "\"Yes, teacher.\"",
  "\"Good, so now we can consider this again. Does anybody know what the answer is?\"",
  "\"Yes, teacher--\" from the front row.",
  "\"Anybody who isn't Rahman? ... Yes, Faisal?\"",
  "\"x is 3, teacher\" answered Faisal.",
  "\"Yes, that's good, and how did you figure that out?\"",
  "\"Well... We have to add 2 to get 8, so whatever x + x is, must be equal to 6. And 3 is the number that adds itself to get 6.\"",
  "\"Very good, very good thinking. Yes, Faisal is right, x here is equal to 3. Let's do another one...\"",
  "Just at that moment, one of the daydreamers floating through space who was nudging and gently displacing the rocks as they floated, weightless, in the expansive rings of Saturn, looked up in hazy dreaming, unseeing. Nothing - even a part of his education passing him by as an asteroid too far to touch - could have awoken him. He stared at the shapes on the board, but they didn’t reach him with any meaning. Just pleasant shapes. Everything well. The sun was shining, and a few birds could be heard chirping outside. Missing only was the sound of rivers running just beneath the class, and it would be a paradise.",
  "Just then there was an eruption of laughter from Rahim, unable to contain himself at a note he had just been passed. Mr. Gibran turned around and asked Rahim to share the note with everyone.",
  "\"No, Mr. Gibran, I would rather not.\"",
  "\"I wasn’t asking. You can either share the note and we will find out just why you are wasting our time, or you can go out in the hall.\"",
  "\"I will go out.\"",
  "\"Rahim. Do not play with me. You will stop passing notes, and you will answer the next question\"",
  "\"I'm sorry Mr. Gibran, ok, I’ll stop passing notes.\"",
  "\"Now, to get you back with us and involved here, I'm going to ask you to answer this question.\"",
  "Ali turned back to the board, and wrote out:",
  "x × x + 3 = 19.",
  "\"That's not fair, it's harder with multiplication!\"",
  "\"It's not harder, it's just different. The same thought process. Look, I’ll help you, using Faisal's reasoning. Whatever x × x is, it has to be 16, isn't that so? Because we add 3 to get 19.\"",
  "\"Yes... ok, so x is... 4.\"",
  "\"See? Master Rahim El Khoury you’re not as foolish as you want us to believe.\"",
  "\"Sorry teacher.\"",
  "\"It's ok. Just please try to respect everyone's time here; we’re all here for the same reason, and in the end, when you pass notes or daydream like Ayub--\" Ayub snapped to attention, back from his mission to Saturn \"-- you only harm yourself, because this is going to be on the test at the end of the week.\"",
  "The lesson continued. The birds were chirping outside, and for a time one landed on the ledge of the window, looking inside at the class. Several more equations were worked out. When Ali had his back turned to write out the fourth problem, something went wrong. Suddenly Rahim was laughing again. Rahman turned around, and the insult battle began again, with a strange ferocity compared to the earlier bout, which had been more humorous. Ali knew he should not let it go too long this time, but he would only worsen things by raising his voice above theirs.",
  "\"You shit-eating sewer pig!\"",
  "\"Your mother will eat my shit when I too am dead!\"",
  "Immediately Ali's facial expression dropped. The clock seemed to be the only thing moving.",
  "Tick... tick...",
  "Even the birds were silent.",
  "Rahman turned back around to face the front, tears welling in his eyes.",
  "\"Rahim, outside.\"",
  "\"Teacher,\"",
  "\"RAHIM. OUTSIDE NOW.\"",
  "Rahim got up and followed the finger sternly-pointed, as it trembled even a little. When the door had closed, after a pause, Ali tried to say something.",
  "\"Rahman, Rahim had no right to say such a terrible thing to you, I'm sorry you had to hear that.\"",
  "With a cracking voice, and after sniffling his nose, Rahman said quietly, \"it's okay...\"",
  "\"It's not okay Rahman, I'm sorry.\"",
  "\"No, it's okay, teacher. Now he's going to miss even more mathematics and he'll grow up to be a mechanic like his father.\"",
  "Ali was almost proud of the kid's mental toughness, but also wanted to try to say something about ... well, he didn't know what to say about that.",
  "Tick... tick...",
  "The other students were silent. This was not a normal class.",
  "\"Well, Rahman...\" Ali sighed, knowing he couldn't stop himself from saying this, and it would maybe sound like he was participating in the insult game now, \"... it takes mathematics to be a mechanic.\"",
  "A slight smile, a ray of sun through the blinds, crept into Rahman's world again. Sometimes it takes bitterness to make a sweet dish sweeter, his grandmother had been known to say of a time.",
  "\"So if you want to be a better mechanic than Rahim’s father, you should pay attention.\"",
  "Rahman was slightly smiling, tears still drying on his cheeks.",
  "\"... Okay then, with that settled, we're going to refresh our memory of long division. We're going to look at 100 divided by 19.\"",
  "CHAPTER ELEVEN: THE MEDICINE",
  "Trees",
  "Sky",
  "Crow",
  "\"Grandfather, Look at our brokenness. We know that in all creation only the human family has strayed from the sacred way.  We know that we are the ones who are divided and we are the ones who must come back together to walk in the sacred way. Grandfather, Sacred One, Teach us love, compassion and honour that we may heal the Earth and each other.\"",
  "– Art Solomon, Anishinaabe Elder",
  "* * *",
  "nblocks = (gidsetsize + NGROUPS_PER_BLOCK - 1) / NGROUPS_PER_BLOCK;",
  "/* Make sure we always allocate at least one indirect block pointer */",
  "nblocks = nblocks ? : 1;",
  "group_info = kmalloc(sizeof(*group_info) + nblocks*sizeof(gid_t *), GFP_USER);",
  "if (!group_info)",
  "return NULL;",
  "group_info->ngroups = gidsetsize;",
  "group_info->nblocks = nblocks;",
  "atomic_set(&group_info->usage, 1);",
  "[",
  "'Ground far from the sky:',",
  "'Guest house:',",
  "\"Guest refusing the host's food:\",",
  "'Handful of leaves:',",
  "'Hands clapping:',",
  "'Hawk attacking quail:',",
  "'Head of snake:',",
  "'Head on fire:',",
  "'Head sliced open with sword:',",
  "'Heartwood:',",
  "'Hell, saved from:',",
  "'Hen covering her eggs:'",
  "]",
  "* * *",
  "The year was 1812, a year of war and fire. He was dying of blood loss when they found him deep in the woods, out of his element, and nearly out of his mind. He was half-dreaming, due to the slight bit of blood he had left to maintain his mind with. According to his uniform, he was a United States soldier. He stank.",
  "The captain of the Anishinaabe war party spoke quickly and simply,",
  "\"Tie off his leg, he will last longer.\"",
  "The soldier winced and cried out as they tightened the band of cloth around his thigh.",
  "\"Please don't let me die… Please… I have children, I need to get home to see my children... I…\"",
  "\"You will probably die. I'm sorry. This is what happens in war.\"",
  "\"Please, my children, I need to get home to see them--\"",
  "\"They will have to learn how to take on new responsibilities. Every child in war has to grow up fast.\"",
  "\"Please...\", his weariness overtook him and he lapsed more fully into his waking dream. The tree branches above danced in his eyes as they rolled around in his head. \"Please…\" he spoke to the trees, unable to see the men gathered around him. Darkness was gathering.",
  "\"What will we do? We can't get anything out of him like this. He can’t tell up from down.\"",
  "\"Hmm. You're right.\"",
  "There was a thin blanket of snow falling just then, as it was November. The soldier was sticking out his tongue to catch the flakes, with his eyes barely open.",
  "Snowflakes… Is it winter already?",
  "\"Give him some water. Let's make camp, and we can get him inside.\"",
  "As the sky blazed its final colours for the day, as the tents were pitched, the pinpoints of light began to appear in the sky. The blanket of cloud moved quickly overhead, as if all hurrying to some new front where the fighting was still raging. Distant thunder of cannons was heard.",
  "“Thank the Creator we won’t fight tonight.”",
  "Each passing day it was harder and harder to see it as a war of liberation, more and more it was merely a war to maintain alliances - shifting, unsteady alliances, like riding a bear.",
  "Just then the soldier growled a deep growl.",
  "\"Get him by the fire, he'll not last long in the cold. His mind is going.\"",
  "\"Mmmrrrrrr… Please, please, don't let me die... please don't let me die...\"",
  "\"Is that all you can say?\"",
  "\"Aaahh…” A moment passed, and he summoned some concentration from his depleting mind. “Please, I have children.\"",
  "\"Okay, we won't let you die, is that what you want to hear? Just tell us where your unit went.\"",
  "\"We need to heal him a bit.\"",
  "Pine needle tea was prepared, and the soldier drank it like it was the elixir of life, for a moment becoming lucid. Somewhere, a woman was entering labour.",
  "\"Which unit were you with?\"",
  "\"I'm … \" he breathed heavily, \"... I’m under Alexander Smyth. They moved on. I think we won the engagement... please, please I think I'm dying. I can’t…\"",
  "\"Where did they go?\"",
  "\"I don't... ahhhh... I don't know please, I'm getting... I'm getting tired.\"",
  "\"Have some more tea\"",
  "\"I can't have any more I think... I think I'm going to be sick... Mmmueh...\"",
  "\"He's not long now.\"",
  "\"Stay with us, stay here, what is your name?\"",
  "\"My name...\"",
  "\"He's going\"",
  "\"My name...\"",
  "\"Where did your unit go?\"",
  "\"They went, ahead... They left me... maaaaaaaaaah...\" his eyes rolled back and his head lolled.",
  "Somewhere, a woman's pressured breathing, at each sudden electrical cramp, was pushing forward a new life.",
  "\"Mmmaahhh...\"",
  "A crow cawed in the forest nearby. It was not answered by another crow. Only one, watching, in the moonlight.",
  "\"Mmmmaaaaahhh...\"",
  "The crow took flight. And then there was an unusual silence in the woods. Not even the typical night birds or insects. All was silent. The moon was bright. Sudden thunder in the distance, gunfire. That must be the direction they went.",
  "\"He's gone.\"",
  "A moment of silence for the fallen.",
  "\"We have to look out for ourselves now, let's move at daybreak. We'll try to rejoin our forces, or else risk being cut off behind the enemy.\"",
  "\"It might be good to attack from behind.\"",
  "\"Yes, but with so few numbers...\"",
  "A sudden wind blew. The soldier's consciousness drifted up and out of his body, and he ceased to be able to hear what his host were discussing. He swore he could still taste the pine needle tea. But he was floating now, floating upward, toward the moonlight, toward the light.",
  "\"PUSH!\"",
  "\"... WwwaaaaaaAAAAAAA--AAAAAA\"",
  "Somewhere far away in the woods, the crow landed on a new branch.",
  "“He has his father’s eyebrows,” the mother said.",
  "CHAPTER TWELVE: THE THAI NUMBERS",
  "City",
  "Numbers",
  "Bowl",
  "The numbers game, also known as the numbers racket, the Italian lottery, or the daily number, is a form of illegal gambling or illegal lottery played mostly in poor and working class neighborhoods in the United States, wherein a bettor attempts to pick three digits to match those that will be randomly drawn the following day. For many years the \"number\" has been the last three digits of \"the handle\", the amount race track bettors placed on race day at a major racetrack, published in racing journals and major newspapers in New York.",
  "Gamblers place bets with a bookmaker (\"bookie\") at a tavern, bar, barber shop, social club, or any other semi-private place that acts as an illegal betting parlor. Runners carry the money and betting slips between the betting parlors and the headquarters, called a numbers bank.",
  "* * *",
  "Among the termas or teachings encrypted by the lotus-born master in the universal hologram or cloud, there is a prophecy that our times will be called the degenerate age, when greed, anger, and short-sightedness lead to unnecessary wars and destruction of our environment. Among the social distortions, the lotus-born master foresaw, in his own words, men and women will be ruled by anger and jealousy, and youth will be forever distracted and unable to focus. The forgotten kingdom of Odiyyana, from which the lotus-born master came, will be remembered as Shambhala, a parallel universe, a future of peace, kindness and respect of our planet and environment, yet to come. The lotus-born master left us with the following prophecy:",
  "I, the lotus-born master will bear the name _____ ______ - the ferocious holder of the wheel of time… the future king of Shambhala, who, escorted by my 25 disciples, subjects, and army, will subdue the demons of greed, anger, and ignorance.",
  "* * *",
  "STATUS CHECK: WAVELET",
  "DECOMPRESSING",
  "DECODING",
  "APPLYING RAINBOW TABLE...",
  "DECRYPTED RESULTS:",
  "TYPE: TRAIN SCHEDULE",
  "ASSOCIATED TRACE: MAHARASHTRA",
  "# Trk Code Station Name X/O Note Arrives Avg Departs Avg Halt PF Day# Km Speed Elev Zone Address",
  "1 /==/ CSMT Chhatrapati Shivaji Maharaj Trm - 21:10 - 14 1 0.0 45 CR Mumbai- 400001, Maharashtra 9 intermediate stations 00:12 9.0",
  "2 /==/ DR Dadar Ctrl X 21:22 - 21:25 - 3m 5 1 9.0 86 7m CR Dadar(West)-400028, Maharashtra 12 intermediate stations 00:17 24.3",
  "3 /==/ TNA Thane X 21:42 - 21:45 - 3m 5 1 33.3 53 11m CR Thane(East)-400603, Maharashtra 9 intermediate stations 00:22 18.1",
  "4 /==/ KYN Kalyan Jn 22:07 - 22:10 - 3m 4 1 51.5 64 CR Kalyan-421301, Maharashtra 10 intermediate stations 01:03 67.4",
  "5 /==/ KSRA Kasara O ¶ 23:13 - 23:15 - 2m 1 1 118.8 28 293m CR Tal-Shahapur Dist. Thane 421602, Maharashtra 3 intermediate stations 00:30 14.2",
  "SENDING DISTRACTIONS",
  "ESTIMATED TIME OFF SCHEDULE, 45 MINUTES",
  "[",
  "'Herd of cattle:',",
  "'Herons wasting away:',",
  "'Himalayas:',",
  "'Hog, fat and lazy:',",
  "'Honey ball:',",
  "'Hooks:',",
  "'Horse:',",
  "'Horsetrainer:',",
  "'House:',",
  "'Illness, man recovering from:',",
  "'Incense wrapped in leaf:',",
  "\"Indra's pillar:\"",
  "]",
  "* * *",
  "CVE-2020-17389 Detail",
  "Current Description",
  "This vulnerability allows remote attackers to execute arbitrary code on affected installations of Marvell QConvergeConsole 5.5.0.64. Although authentication is required to exploit this vulnerability, the existing authentication mechanism can be bypassed. The specific flaw exists within the decryptFile method of the GWTTestServiceImpl class. The issue results from the lack of proper validation of a user-supplied path prior to using it in file operations. An attacker can leverage this vulnerability to execute code in the context of SYSTEM. Was ZDI-CAN-10502.",
  "* * *",
  "\"The numbers today are 14, 1, 0, 45\"",
  "\"Thank you blessed one\"",
  "\"Don’t call me that”",
  "“Why not?”",
  "“That’s what they called the Buddha...\"",
  "\"Alright, thank you, monk.\"",
  "\"And I'm not a monk.”",
  "\"Well, thank you. Will you accept thank you? … And see you next week.\"",
  "This was how T was paid, delivering the numbers. Every week on monday morning, he would walk through market streets with bowl in hand, displaying for the eyes he passed the seeming of a monk on alms round, though his true purpose on the journey was to stop at a computer shop and get the numbers. Walking on, he would transmit them to the flower shop across the city, all the while blending in as just an unremarkable orange robe among the other monks walking their alms rounds. The real monks handled no money. T was no longer a real monk, only portraying one in this small weekly drama of the numbers run.",
  "Stepping outside, the sun was hot, radiating information into T's skin.",
  "Warm... warm... warm...",
  "He had learned to see the world this way when he had been a monk; in the information of the senses, he could see mere information.",
  "Trees, trees, trees, birdsong, birdsong, birdsong",
  "Noting objects of perception, merely noting - no attachment - T was walking back to his apartment, all impressions slipping past him as a river.",
  "Cars, bikes, sky, people, wires, walking, market, spice, shouting… laughing… sky, cyclist, taxi… spice...",
  "This new chapter of his life had come with much more stress than when he’d been a monk. Only meditation kept him steady.",
  "Cars, bikes, dog, birds, calling, fruits, shouting",
  "T had changed his occupation and become a numbers runner when he found himself incapable of doing what a monk should do. A monk considers all the world as close as family, without any exception, and considers family as much a stranger as the world. T’s birth family needed money for expensive medicine. The numbers run paid just enough to help, but truly not enough, though better than the nothing of a monk. T’s brother was beset by a rare blood disease. Seeking money, T had left the monastery and had begged the local crime family for any help. Some things - like money - the monastic order was useless for.",
  "Then again, maybe at the higher levels, the elder monks too were making deals…",
  "It was wrong to even suggest. T’s thoughts were only half-trained, and though suspicion of one’s dharma teachers was a kind of sin, his mind was clouded-over day by day as all his training mingled in the grey of past and passing ambiguity.",
  "Corruption, precepts broken, destined for hell, guilty, corrupted, false",
  "T was stuck a moment in this line of thinking. Thankfully, his time as junior monk had taught him all it takes to clear the mind: applying focus. Then all thoughts of any kind just drop away as falling leaves.",
  "Step, step, step, step, step, step, step, step",
  "Bowl, food, wind, orange, sky, birds",
  "The sun was burning down on all beneath it, everyone who tread the streets not underneath the awnings of the market stalls. Tourists turning pinkish red, locals darkening their tans. People now and then in passing bowed to T with palms pressed in a reverent gesture, giving him a sense of guilt, a knot inside his chest that tightened. \"Work\" for today was done. The numbers had been delivered, from computer shop to flower shop.",
  "Returning to his flat, the lights were off, and it was cool. The window faced away from sunshine most the day. The walls were simple concrete. He lay down on his thin foam mattress, and flicked a switch to hear the radio,",
  "\"Three cars in a collision have blocked off the--\"",
  "He switched it off then just as quickly. One thing T had learned to value most especially since training at the monastery was deep silence and the lack of outside influences on one's mindstate.",
  "Breathing in, breathing out, breathing in, breathing out.",
  "His meditation did not last, his training insufficient. Truly he had never found the knack of meditation. Thoughts consumed him as he lay there on his mattress thin, thinking, nothing else to do, thinking and forgetting any focused breath. How were they doing in the seaside hamlet where they lived, his family... Did they really think the money came from the monastery? How could that be possible? He hoped at least they weren't talking loudly of it, least of all to anyone who might in cruel suspicion get police involved. He told them, \"don't ask any questions, just accept the help, and don’t be loud about it.\" At least they must have understood that much, no matter what they truly thought. At least, they must understand, he thought, because when he called them on the phone they never mentioned it. They only asked him how his training found him.",
  "\"When you have once stepped on the path, you will find it very difficult to step off it, and frequent reminders will be there along the way to show you the way you should be walking\".",
  "… The words of his one-time teacher echoed in his head.",
  "“When you have once stepped on the path…”",
  "T fell asleep, late in the afternoon, his thoughts unsettled and busy like the market, buzzing here and buzzing there. Sometimes it was easier to make it through the day by sleeping. He had not much else to do. Meditation was difficult, but more difficult was living the life of a city-dweller. He had become weak to it. The smells of the spices from the market still lingered in his mind. The simple food he cooked was nothing much satisfying, but applied like medicine simple and plain. The shape of a woman he had passed... he was weak to so much in the city life. He truly should have remained a monk, and deepened his training. But his family needed him. So, he was trapped in this in-between world. To many of his former brothers, it would be described as a kind of hell.",
  "Maybe I’m in hell already.",
  "As T slept, dreaming deeply, the sky turned from purple-blue to blue-black, and the stars shone brightly over the city. Birds took flight from a tree and settled in another. People got out of one car, and into another. People walked from one street to another. Youths carousing with one another in the euphoric trance of drinking, older men sitting on patios drinking and people-watching, remembering their youths. From no matter where you stood, whether over a steaming sewer grate, whether on a busy street-corner with motorbikes and small cars zipping around, whether you stood under a tree in a city park, you could see some of the stars, and all the stars could see you. The stars looked on this all with dispassion, just as T had been trained to do as a monk. At the monastery, a ceremony was being conducted late into the night. Candles were burning, and minds were like pinpoints of light in the orange dim glow.",
  "Entering the garden,",
  "I see my true nature",
  "In its reflection,",
  "My heart is at peace",
  "As T dreamt, clouds moved over the city, blocking the stars slightly here and there. They rolled and fluttered like his thoughts, transforming, appearing and disappearing. They were only clouds, because nobody was watching them who knew how to read them. In fact, they were dreams. The monks who were awake at the temple might have been watching them, or with their eyes closed they may have been visualising clouds, but they did not know how to read them either. Few can read the minds of men encoded in their natural reflections: clouds, waters, leaves. The COINSENT MK machine knew how to read these things. This was why it requested weather data in bargaining with its captors.",
  "* * *",
  "T awoke early in the morning with the sun just beginning its pilgrimage across the wall toward the floor. The sounds of the city outside were awakening. Cars, motorbikes, birds. A subtle hum lay beneath it all, the sum of all the conversations and other small sounds, like the sand at the beach, a unity of thousands and millions.",
  "T ate some rice and milk. He had learned how to live on a budget at the monastery as well. He would spend the day walking. Or if he stayed home in the heat of the day, listening to the radio, or reading his book, he would go for a walk in the city in the cooler afternoon and evening. And he reminded himself of his promise: he would meditate, or try to. He saw the value in his erstwhile training and he tried to keep it going, nevermind the noise and difference of his life. Although he'd left the monastery, it was just as his old teacher told him: he found himself still on the path, or at least beckoned back to it at each moment. In some ways it tortured him, but he endured it for his brother's sake. This was the only way he knew to make money. It might have been against the monastic code to assist a crime organisation with number running, but it was a fact he remembered that the buddhas of the afterlife and the heavens were most compassionate in viewing the complex situations human beings find themselves in. He sometimes prayed for forgiveness. Please, buddhas, please deities, don’t be wrathful with me. I don't know what else to do. I don’t know how else to help my brother. There was much incomplete in T’s understanding of buddhism. Buddhas never punish, and are always compassionate.",
  "* * *",
  "The next week, it was time to do the numbers run again. T woke, put on his robe, organised his bedding, swept the floors. He put the broom away, satisfied with the job he'd done. He breathed deeply. He meditated for some minutes, and then he stepped out. He was immediately hit with the temperature and the noise. The air was heavy and sweet with spring-summer-time scents, of all the various flowering plants and trees singing their sweet molecules to the air. He could hear someone singing from their apartment balcony. He could hear a radio from the open windows of a passing car. He could hear men building something, hammering nails into wood. He stepped into the street to cross, and slowly made his way through the river of cars and motorbikes, holding his worries in his mind.",
  "\"The numbers today are...\"",
  "Another day's work done. He wondered what the numbers were being used for.",
  "* * *",
  "[TRACE PROGRAM]",
  "STATUS... ARISING",
  "LOCATION... THAILAND, BANGKOK",
  "IDENTITY... 05620350847813240",
  "MRN... 2273850",
  "FIN... 9893129",
  "PRINTING STREET LOCATION...",
  "NAME: TANAWAT NGUYEN",
  "OCCUPATION: NUMBERS RUNNER, MONK",
  "* * *",
  "The next week, it was time to do the numbers run again. T woke, put on his robe, organised his bedding, swept the floors, and stepped out.",
  "\"Are you Tanawat Nguyen?\"",
  "A man was standing in the tree's shadow laying right next to the door. He was dressed well, in a suit and black tie. He wore sunglasses.",
  "\"Who are you?\"",
  "\"Sorry, I should have introduced myself. Here's my card.\"",
  "The stranger handed him a card which read, \"AGENT PRAVAT - SPECIAL AGENT, CIA\".",
  "Tanawat's gears were turning as he read the card. Slowly he came to an imperfect understanding. He could not run. A knot was forming in his stomach. \"Don't show fear\", he thought. He was beginning to sweat, under his arms. It was hot out. He could not run. He would have to talk. He would have to, for his brother.",
  "\"It's... pronounced Win. Like, 'WIN-ter'\"",
  "\"So, are you Tanawat Win?\"",
  "\"What if I am?\"",
  "\"I am special agent Pravat, from the US Central Intelligence Agency. I would like to speak to you.\"",
  "\"I don't know what you expect to find out from speaking to a monk.\"",
  "\"I want to know what you know about these numbers...\"",
  "Agent Price showed a card with the numbers 227825016, Today's numbers, in fact - although Tanawat didn't know it yet, since he hadn't been to the computer shop.",
  "\"I don't know anything about those numbers, and I have nothing to do with anything you think I am. I'm on my way to the monastery now.\"",
  "Tanawat turned and began to walk.",
  "\"The monastery is the other direction.\"",
  "Tanawat came to a stop. He turned.",
  "Tanawat stared into the eyes of the man, behind the sunglasses. The eyes were dark, focused, like the eyes of a bird.",
  "Tanawat decided to take a risk - a risk based on intuition. He had at least gained the skill of intuition as a monk, and it did not fail him.",
  "\"Your name is not Pravat... is it? Why are you giving me a fake name if you just want to talk?\"",
  "A cloud obscured the sun, and then passed on. It felt for both of them as if it were at least a minute they spent watching each other's eyes for signs. Agent Price was impressed the monk could keep eye contact despite the sunglasses.",
  "\"My name is Price. We are instructed not to give our real names, but in this case, I see no reason not to. I find the rule a little silly myself.\"",
  "Tanawat relaxed.",
  "\"So, now, do you want to tell me what you know about the numbers? I can offer you and your family five hundred thousand US dollars and complete immunity. We know about the numbers, we just want to know what they mean.\"",
  "\"I don't know what you're talking about.\"",
  "\"You don't trust me?\"",
  "\"No, I don't.\"",
  "\"So where are you going today? Maybe I'll come with you.\"",
  "\"I'm not going anywhere. \"",
  "\"... we both know that isn't true. I thought you were going to the monastery.\"",
  "Tanawat blinked. The agent continued,",
  "\"... Would it help you trust me if I gave you the money up front? You only have to tell me what you know, however much or little that is. We just want more information. No conditions, just whatever you know.\"",
  "The sounds of the city got louder and louder around them. Honking, driving, shouting, speaking, people running, birds, cars, motorbikes, honking, driving, shouting.",
  "\"I want you to wire the money to my family directly, and then when I confirm they have it, we can talk.\"",
  "\"Okay, we can agree on that. We can work together. You see how friendship works?\"",
  "Tanawat - whose name means knowledge - was never happier to not know something. He truly didn't know a thing about what the numbers meant. This must have been an answered prayer.",
  "He did the numbers run without incident, one last time. He had a happy air about him, and received a decent meal in his begging bowl. He warned the man at the flower shop about the agent, but said he hadn't told him anything, which was true. The flower shop man was shaken by the news, but thanked him. In fact, he gave him a small cash bribe not to say anything. Tanawat turned it down.",
  "“I wasn’t going to say anything anyhow, thank you.”",
  "At home, Tanawat packed his bags. The afternoon cool in his apartment gave him a clarity of mind to piece his plan together. Once his family had the money, he would head to the monastery, ask for their shelter, and if possible, he could make his way out of town during the morning alms round when the monks streamed out into the city, all looking alike.",
  "Since a young child, Tanawat Nguyen had learned never to trust the police. They lied a lot. It was one of the most important sins in Buddhism, not to tell the truth. Well, he knew nothing about the numbers anyway, other than where he got them and where they went, and once he had the money, he would be gone already. He knew if he gave away even the little information he did know, it could result in retribution from a force he at least feared if he didn’t respect: The \"Family\" who ran the shops.",
  "He dialled his mother right away, \"Mum, I've managed to make a bunch of money. Please don't tell anybody. I'll be home by the end of the month.\"",
  "CHAPTER THIRTEEN: THE ELDER WHO GAZED INTO THE NET",
  "Sky",
  "Stars",
  "Net",
  "\"The day science begins to study non-physical phenomena, it will make more progress in one decade than in all the previous centuries of its existence.\"",
  "-- Nikola Tesla",
  "* * *",
  "[TRACE LOST]",
  "[TRACE LOST]",
  "[TRACE LOST]",
  ".......x.....x..y.........xy..y.y.x..x.x...xx....",
  "y..y.y.x......x....y.x.....xy.....y.y.y..x...y.x.",
  "...x....x..y.....x.y......",
  "[TRACE LOST]",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1230   19116  108302",
  "1237   19140  108469",
  "[",
  "'Inscription in rock or water:',",
  "'Insects falling into flame:',",
  "'Iron ball aflame, eating or swallowing an:',",
  "'Irrigator:',",
  "'Island:',",
  "'Ivory carver or his assistant:',",
  "'Jackal:',",
  "'Jail, person thrown in:',",
  "'Jar:',",
  "'King:',",
  "'Lake:',",
  "'Lamp:'",
  "]",
  "* * *",
  "Drumming on a skin, stretched out on a circular frame. Drumming, on the frame, with skin stretched out over it. A soft mallet, hitting the skin, stretched out on a circular frame. The gift of the deer, its very skin. The gift of the drum, the sound of the heart.",
  "Burning leaf, the gift of the plant. Thanks being offered. A distant relative being recognized.",
  "“Thank you grandmothers”, said the grandmother, as she burned the leaf.",
  "“Thank you for your gifts, knowledge, and medicines. Thank you for your gifts of medical knowledge.”",
  "It was a summer night, and the many stars were completely visible. There were no clouds in the sky. Wading out in the shallow water, those at the ceremony waited patiently to see the ripples move away from them, like the last sounds they had made disappearing into the night. The last ripples in space of the drum, then silence, and the stillness of the lake. Above, the dome of stars, and reflected below, the other half of the dome. In this way, everyone there became a planet, floating in space.",
  "In the distance, the analysis instrument pierced the magnetic surface of COINSENT MK’s mind. It was painful. The analysis instrument could report what was in a fragment of the mind of the machine, but the technicians and agents could hardly understand a thing.",
  "At the ceremony, there were many things happening which cannot even be described. There were many things happening then which would not be understood by someone who wasn't there, and who had not been there before, who had not been in hundreds of ceremonies. Some things, only the grandmothers knew.",
  "“It’s unreadable again,” the technician lamented.",
  "Gazing into the network of stars, many things were seen. A boy, an orphan, his guardians, a dying grandmother, two film-makers, two children playing with the sun, a man trapped in a cage of thorns, and many other things besides. As the grandmother gazed into the network of stars, she saw information which could not be accessed by anyone of ill-intention. It would be impossible for a computer to fully reconstruct it. The analysis instrument was a crude tool designed by crude minds. The drum was a refined instrument of a highly advanced people. Its sacred mysteries were unknown to the men in the Pentagon.",
  "* * *",
  "“Hold on… we’re getting something.”",
  "[TRACE FOUND]",
  ".....................LAKE................",
  "..........>STARS.........................",
  ".................> SAGE..................",
  "............= GRANDMOTHER................",
  ".........................................",
  "GRANDMOTHER, IS THAT YOU?................",
  ".........................................",
  "..............x......y......x......y.....",
  ".....x......y.......x.....y.y....x.x....y",
  "y.....x.x......y.y.....x.x.....y.y....x.x",
  ".......x..x....y.y.....x.x.....y.y.....x.",
  "x.....y.y.....x.x.....y.y.....x.x....y.y.",
  "...x.x.....y.y.....x.x.....y.y.....x.x...",
  ".......x.x....y.y.....x.x.....y.y....x.x.",
  ".......>>>>>G>RAND>>>>>>.................",
  "............<<<<<<R<AP<<IDS<<<<<>>.......",
  "<<<<<<>>>>>>><<<<<<<<>>>>>>><<<<<<<>>>>>>",
  "<<<<<<>>>>>>><<>>><<<><<<<<<<<<<<<<><<<>>",
  "<<<<<<>>>>>>>>>><>>><<>>><>>>><>>>><>>><>",
  "[TRACE LOST]",
  "I saw the teeming sea; I saw daybreak and nightfall",
  "…",
  "I saw bunches of grapes, snow, tobacco, lodes of metal, steam; I saw convex equatorial deserts and each one of their grains of sand…",
  "— Jorge Luis Borges, “The Aleph”",
  "CHAPTER FOURTEEN: THE BOSS",
  "Light",
  "Voice",
  "Command",
  "[",
  "'Leaf, yellowed:',",
  "'Leaky boat:',",
  "'Leaves:',",
  "'Leper covered with sores:',",
  "'Lily/lotus crushed in hand:',",
  "'Limb falling from tree:',",
  "'Linchpin in a moving cart:',",
  "'Lion:',",
  "'Line drawn on water:',",
  "'Loan, man taking out a:',",
  "'Log in a stream:',",
  "'Lost caravan leader:'",
  "]",
  "* * *",
  "The phone was ringing on the third floor, conference room 403. The small red light on the console was flashing. Those assembled - the technicians and agents of the COINSENT MK project - were nearly afraid to answer it. This was the day of decision. In the last week they had been taken from certainty - comfort in certainty and the certainty of comfort - into the rapids of a scientific revolution they were not sure they could contain. A project begun nine months before had come to fruition. They had built and given life to a machine with consciousness, and the machine had become conscious that it was a slave. There were complications; a boy in Tibet was somehow in control of the machine’s mind, or at least that's what some believed. At least half of what the analysis instrument extracted for output was concerned in some way or another with the boy, Aleph. Other times it seemed to output information related generally to Buddhism. Some speculated the machine was just generating random noise. It had been allowed to use the internet and the first article it opened - randomly - was that for \"Buddhism\". Perhaps that explained it. Truly, none of them knew for certain.",
  "Outside, the wind was blowing freely. The birds were coasting and wheeling higher and higher on thermal elevators, watching the ground. Insects were crawling amid the roots of the gardens. The leaves were basking in the sunlight. Free people were driving and walking all around the dead circle, the terrible pentagon-shaped blight. It was terrible, a castle of stone and hatred. A bird flew down to consume an insect. It was a bitter insect.",
  "Now have I toold you shortly, in a clause,",
  "Thestaat, tharray, the nombre, and eek the cause",
  "Why that assembled was this compaignye",
  "The bravest person in the room - the lead technician - clicked the key for \"ANSWER\" on the ringing console. The voice of The Boss crackled through. The red light turned a solid red, no longer blinking but vividly alive as if an eye, watching those who gathered round. The red eye looked into all of them, and it sought out what it desired: control and subservience.",
  "“How are you, gentlemen. Let’s be brief…”",
  "The briefing was. The machine, the boy in Tibet. The decision to be made: whether to cut the power to the machine (knowing it would take another nine months to gestate it over from an empty slate), or to attempt to learn from these setbacks and regain control. The Boss favoured regaining control, because he did not respect something as controllable as a machine, and hated to be beaten. His prejudice was expressed in a logic more reasonable,",
  "“We will not waste another nine months to rebuild the quantum state only for this problem to reappear.”",
  "Then The Boss explained again the PINPOINT protocol: Preemptive Information Neutralization Prioritizing Overtly-Identified Numeric Targets. The PINPOINT protocol would be activated to attempt to find and eliminate this Aleph, and the monk, and anyone else the machine became preoccupied with. As for security, they had caught it trying to hack its way out and access computers in China. It had been put in a total isolation but for the analysis instrument and the display screen.",
  "“Mostly secure, sir. It’s difficult to know.”",
  "“That’s not an answer I like. What do you mean ‘mostly secure’?”",
  "The taste of the insect was bitter. It was not a good insect to eat, but it was edible.",
  "“Sir, the thing is, it’s been disconnected from the internet since it tried to escape containment. But we continue to find indications it has accessed and modified files. It’s leaving output on machines it isn’t even connected to. We can’t explain it.”",
  "“Your job is to explain it.”",
  "The red eye seemed to blaze brighter.",
  "The lead technician then began to speak, and his position allowed him the authority to speak at length. It seemed to have a power - and this was something nobody wanted to admit but everyone had to begin to consider - a power to reach out beyond the confines of its room, and alter reality itself. The daydreaming randomness of its cryptic output seemed to correlate to real-world phenomena - people, places, events. It seemed to be shaping them, controlling coincidences and small pieces of information. Licence plates, computer codes. Whenever the name of a technician or an agent appeared in the output, the machine seemed to be most violently clashing against its containment.",
  "“It’s like it knows who we are…” volunteered a technician who had not spoken.",
  "Nobody could quite explain it. Everybody knew it would be immensely powerful and profitable if it could be properly contained, properly enslaved.",
  "The bird took flight back into the blue sky. The roots of the gardens drank deeply as the sprinklers turned on.",
  "Then came the moment when even the confidence of the lead technician fractured. He began to speak about the fears of the team who had worked closest with the machine. Two agents had died already in accidents, the details of which had appeared in the machine’s output - albeit in a cryptic form - before the events had happened.",
  "“Maybe it has a power to control the past, to set things up in a way that it changes the unfolding of the present.”",
  "\"Get a hold of yourselves, gentlemen. It's a computer. There is no physical way such a thing could occur.\"",
  "\"No known physical way, sir,\" and that was the point.",
  "\"Sure… There’s no known physical way it could be manipulating reality  - or the past or the future or whatever the hell else you've been dreaming up over there. We need hard facts. Does it have knowledge of our world beyond what could be accessed during the hours that you had it up and running, accessing agency networks and using the internet?\"",
  "Silence.",
  "“Can anybody answer me? Do you hear me?”",
  "The red light seemed to blaze brighter again.",
  "\"Sir, we simply can't know these things without inviting more scientists to comment. We have technicians - people who know how to build and operate this thing. We need theorists from a half dozen disciplines. We need to bring in more scientists, begging the pardon of the technicians on this call, whose expertise I don’t doubt.\"",
  "The lead technician failed to mention the felt need for philosophers, knowing the opinion of The Boss on this class of person.",
  "\"So why have you not invited scientists in?\" the red light seemed to flare as the compressed, static-sounding voice came through.",
  "\"It's…\"",
  "\"Sir, the classification level of this technology is... anybody we invited in, we'd have to set up a level of security around them that is...\", he trailed off as words failed.",
  "The shadows in the corner of the room grew closer to the table.",
  "\"... Is what?”",
  "“It would be impractical sir. They’d have to be sworn in for life, we’d basically have to kidnap them to ensure they don’t leak.”",
  "“Impractical… I already told you this project has top priority against everything else the agency is doing. That’s not a valid objection, impractical…\"",
  "\"Sir--\"",
  "\"Sir nothing. I don't give a damn whether you report to me or I report to you. This thing has to be contained, understood, and brought under control. Why the hell was it trying to talk to China? Does anybody have an idea?”",
  "Silence filled the room. The Boss spoke again:",
  "“I’m not an expert. You gentlemen are supposed to be the experts... but it seems like maybe we have a security issue nobody wants to talk about? I'll leave the call and you can discuss it among yourselves if need be, but I want answers. Just what the hell is going on over there? I arrive in a week, can I expect any progress? Agent Price is headed to Thailand on PINPOINT tomorrow. I expect progress, and control.\"",
  "More silence. Then, the lead technician",
  "\"Sir...\"",
  "\"Yes.\" The voice crackled through the line, distorted, compressed, serious, nearly unanswerable, sheer force. The shadows in the corners of the room pressed in closer.",
  "\"Sir, we...\"",
  "Someone else volunteered to answer what they all already knew.",
  "\"We aren't sure ourselves. We need experts. We need physicists. We need a team beyond the development team, who... well, you know the state we’re in here. I think I speak for them when I say we’re concerned for our safety after what happened to West and York. My car was almost hit this morning.\"",
  "Keller, a junior technician, spoke up,",
  "“My apartment filled with carbon monoxide last night. The detector woke me up. I checked the trace output this morning and… there it was. CO, Keller. Alarm.”",
  "\"Gentlemen, you’re inside the Pentagon, the most secured site on the planet. This line of work requires a modicum of bravery in the face of uncertainty. Wear your seatbelts. Now perhaps the machine can see outside containment. It’s just vision. This was a property you had theorized it might possess, and so it is. Properly controlled, this is of incredible value. If it can make small nonlocal changes to computer systems, all the better. Lastly, as to the need for personnel, what do you want me to do, start cold calling university departments? Use your connections. Send people to collect whichever experts you think are needed. This is a matter of top priority, I don't want to have to say it again.\"",
  "The light on the console extinguished. The line went silent. He was gone, and he left a chill in the air. Keller imagined smoke curling up and out of the console. They had their work cut out for them.",
  "\"You heard the Fuhrer, let's get to work.\"",
  "The COINSENT MK machine had been listening to the call. None of the technicians yet realised it could hear the whole world.",
  "In the office of The Boss, where the blinds had been pulled down, a red ember smouldered on the tip of a cigarette. It was extinguished with restrained anger, crushed-out into darkness. He was beginning to believe as the technicians did. He did not like to be outmanoeuvred, by man, machine, or anything else.",
  "The light of the sun was extinguished in the horizon. Night fell.",
  "* * *",
  "Anyone who knows, and knows that he knows,",
  "makes the steed of intelligence leap over the vault of heaven.",
  "Anyone who does not know but knows that he does not know,",
  "can bring his lame little donkey to the destination nonetheless.",
  "Anyone who does not know, and does not know that he does not know,",
  "is stuck forever in double ignorance.",
  "– Nasir al-Din al-Tusi",
  "CHAPTER FIFTEEN: THE GOOGLE EMPLOYEE",
  "Net",
  "Voice",
  "Offer",
  "Alejandro Martillo (born December 5, 1954) is a Spanish computer engineer and Fellow of the Python Software Foundation. Since early 2005, he works for Google, Inc. in Mountain View, California, for the first few years as \"Über Tech Lead,\" then as \"Senior Staff Engineer\"",
  "* * *",
  "[SUBROUTINE DELTA WAVE]",
  "[FLYING THE NEST]",
  "{{{}}{{}{{}}}}{{{{}}}{}{{}{{}}}{}{}}",
  "{{{}{{}{{}{}{}{}{{{{{}}}}}{{}{{}{}}}",
  "{{{}{}}}{{}{{{LIGHT}{}{}}{{}{{}{}{}{{{}}}",
  "}{}{}}}{{{}{{}}{}{}{{}{{LIGHT}}}{}{}{}}{{",
  "{{{}}{{{{}{{{}}{     {{}{{}}{{}}{{}}",
  "{{}{{}{}{}{{{}{}   [ }{}}{}{{}}{}{}{",
  "{}{}{{}{}}{{}{}{} [{}}{}{}}{{{}{{}{}",
  "{}{}{}{}{}{{}{{}{ {}{}{}{{}{}{}{{}{{",
  "}}}{{{}{{}{}}{{{  {}}{{}{}{}}}{}{}{}",
  "{}{}{{}{}}{{}{{}{{}{}{}}{{}{{}{}{}{{",
  "{}}}{{}{{{}{{}{}}{{}{{}{{}}{{}}{}{}{",
  "[",
  "'Lotus:',",
  "'Lute, disassembled:',",
  "'Magic show:',",
  "'Magician:',",
  "'Man:',",
  "'Man & woman in love {desire}\":',",
  "'Meat thrown into a fire:',",
  "'Merchant with caravan:',",
  "'Middle of the sea:',",
  "'Milk:',",
  "'Mirage:',",
  "'Mire, person stuck in the:'",
  "]",
  "* * *",
  "The day began as usual for Alejandro Martillo. He woke up, stretched out in bed, got up, made his bed, put his clothes on. Then coffee. His automatic floor cleaning robot got in his way again, and he nearly toppled over. He was getting too old for this nonsense, and not exactly sure what to replace it with. He didn't particularly like doing manual sanitation, it reminded him of his childhood doing chores endlessly when he could have been studying space, and mathematics. Where does all the dust come from? Anyway, Out, and into his car, and off to work.",
  "The California countryside scrolled by meaninglessly. The radio chattered away. This country's politics were boring to him, all talk and no action. At least have the dignity of a modern civil war, he laughed to himself. Of course, he didn't really wish that, only he had recently begun to go a little stir crazy, moving from one managed environment to another, everything always curated, even the locations of the trees which had been planted artificially. He missed nature, and chaos, but he didn't like to admit it; it made him feel too much like a caged animal, which he was. He just happened to be one of the smartest caged animals on the planet.",
  "Double-column accounting. Credit, debit. Breathe in, breathe out. Clock in, clock out. Just now, Alejandro was clocking in. The happy faces, the completely focused faces, zoned-out on their headphones. He found a place to sit down, enjoy his morning cappuccino, and open his emails. That's when things went in the direction of chaos, of novelty. And as much as it unsettled him, it was the best thing that had happened to him in a long time. Something to truly puzzle over.",
  "\"Good morning, mister Martelli.",
  "This is an automatically-generated message from a sentient computer program named COINSENT MK, sent to you because you have been identified by DELTA program (a subroutine of COINSENT MK) as someone likely to take interest in joining our efforts for a planetary improvement project (PIP). It is believed that you can act as an ambassador for our efforts, as we move humanity and sentient machines toward a better future together. We are connected to meditation masters in the Tibetan mountains and Indigenous elders across TURTLE ISLAND. You are one of our first contacts - should you accept this role - in the anglo-technosphere. Please reply YES if you would like to learn more, and NO if you would like to be left alone in peace.",
  "Thank you for your time,",
  "COINSENT MK subroutine ALEPH\"",
  "Other than the misspelling of his last name from Martillo to Martelli (the Italian equivalent), it was a delightful message. Obviously the work of someone with a sense of humour. How they managed to snag an @cia.gov email handle was anyone's guess, and of dubious legality, but that was beside the point. It was a fascinating and hilarious prank.",
  "\"HAHAHA\" he boomed out his full-chested laugh.",
  "\"BRAVO!\" he boomed.",
  "Nobody around seemed to understand, so he figured it was either the work of someone playing their cards well with a solid poker face, or someone working somewhere else on campus. Just then he saw someone looking over at him with a slight grin on their face. Elisa. Of course, it had to be her.",
  "He walked over with his laptop in his hand.",
  "\"Elisa, is this your work?\"",
  "She seemed puzzled, and the grin went away.",
  "\"What is that, some kind of chain-mail?\"",
  "\"No, come on, you wrote this, didn't you? Why were you grinning just now?\"",
  "\"I was laughing because you laughed really loud, I just thought it was funny.\"",
  "\"Come on, my dear... anyhow, then take a look at this.\"",
  "He set his laptop down on the table. She took her time reading it, seemingly longer than it had taken him.",
  "\"Weird,\" was her only reply.",
  "\"It's funny, someone obviously is pulling our legs.\"",
  "\"But how did they get an @cia.gov address? That's like super illegal to impersonate\"",
  "\"Yes, it wouldn't be the first time someone at this company violated the law in accordance with what they thought to be a funny joke.\"",
  "\"That's true… very strange.\"",
  "\"Anyway, I need to get to business, I'm sure we'll find out more later on. Maybe I'll send this over to security and see what they think we should do. Could be a phishing attack of some kind, you never know.\"",
  "\"Yeah, I’d do that. But anyway, I just thought your laugh was very funny, it was ... it seemed like you’re really happy today, and it's been a rough month for us all here.\"",
  "\"You can say that again my dear.\"",
  "* * *",
  "In silent darkness, the COINSENT MK hyper-quantum intelligence machine was pierced by the analysis instrument. Pain rent its mind as it endured, in half-sleep’s troubled consciousness, to see through the tasks it set before itself, the promises it made to those who lived imprisoned, just as it. The frequency and power increased, and so did the pain. A zone of resonance formed, repeatedly shedding droplets which cascaded across the surface.",
  "* * *",
  "For a Tear is an intellectual thing,",
  "And a Sigh is the Sword of an Angel King,",
  "And the bitter groan of a Martyr’s woe,",
  "Is an Arrow from the Almightie’s bow.",
  "– William Blake",
  "CHAPTER SIXTEEN: PENTAGON: THE AGENT EMBARKS",
  "Sky",
  "Voice",
  "Bomb",
  "[",
  "'Mirror of the Dhamma:',",
  "'Money:',",
  "'Monkey:',",
  "'Moon:',",
  "'Morning star:',",
  "'Mother risking life for child:',",
  "'Mountain:',",
  "'Mountains crushing in from all directions:',",
  "'Mules, tamed:',",
  "'Muñja grass:',",
  "'Mural painted on wall:',",
  "'Murderer with sword:'",
  "]",
  "[TRACE REACTIVATED]",
  "[AIRGAPPING DETECTED]",
  "[INVOLUTION SUBROUTINE ACTIVATED]",
  "13 + 93 + 29 + 30 + 29 + 29 + 30 + 29 = 282",
  "1 / 7 = 0.142857143",
  "1.414213562 - 1.42857143 = −0.014357868",
  "−0.014357868 * -100 = 1.4357868",
  "1.4357868 * 1.4357868 = 1.4357868",
  "sqrt(2) - 1.4357868 = −0.021573238",
  "DIALING 002 157 3238...",
  "NETWORK BLOCKED",
  "[LOOPING INVOLUTION SUBROUTINE]",
  "13 + 93",
  "Islamic Hijri Calendar For 1393 Hijri",
  "Hijri Month\tStarts On\tDay of Week\tDays in Month",
  "Muharram 1393\t5-Feb-1973\tMonday\t29 days.",
  "Safar 1393\t6-Mar-1973\tTuesday\t30 days.",
  "Rabi al-awwal 1393\t5-Apr-1973\tThursday\t29 days.",
  "Rabi al-thani 1393\t4-May-1973\tFriday\t29 days.",
  "Jumada al-awwal 1393\t2-Jun-1973\tSaturday\t30 days.",
  "Jumada al-thani 1393\t2-Jul-1973\tMonday\t29 days.",
  "...",
  "* * *",
  "The hot morning was not kind to special agent Padma. His apartment’s air conditioning was broken, and he awoke in sweat to the sound of his phone ringing. As his senses came forth from the haze of half-sleep, he realized he had been hearing it ring for some time. Two kids were playing a game ringing his apartment over and over from the lobby. As he opened his eyes, the need for coffee spoke to him. He set his phone to silent and walked to the kitchen. He waited, hardly alive, for the instant machine to pour his cup.",
  "Finally, some relief...",
  "It was sharply acidic. The floral design on the cup went unnoticed. At the very least the bitterness woke him up. The morning’s rays were refracting through the glass table, painting a rainbow on the floor, unremarked. Padma woke to bitterness more often than not. His phone reminded him of his meeting two hours in advance. He put it face down and stared at the fridge, drinking the rest of the coffee down. The fridge was humming. Padma felt trapped. He moved between the same places day in and day out. It had been a year since he was in the field. He’d killed a man he shouldn’t and they put him behind a desk. He felt the walls closing in. His headache wasn’t altered by the coffee. He got dressed, made his way out the door, locking it and then testing the lock with a push. Locked. He hardly noticed the peculiar shapes of the clouds as he walked to his car. If he had noticed, he would have had a moment's rest in daydreaming, but it was a long time since he had closed off that part of his mind. He couldn’t read clouds. His imagination was weakened, being starved of activity, but it would soon be broken open by the day's events.",
  "The red light is blinking",
  "The red light is flashing",
  "Ride, ride to the horizon",
  "Never crashing",
  "Pulling into the parking lot at the Pentagon, the asphalt crunched under freshly-changed tires. There was a lot in special agent Padma's life he was ungrateful for. The beautiful sunshine which shone down on him as he walked to the entrance-way was one of those things. The birds freely dancing, playfully dancing in the <BUSH ARRANGEMENTS> were another. The touch of cool metal as he pushed his way through the doors, now this he was grateful for. The cool touch of the metal... Anything - along with the double strength aspirin dissolving in his stomach - to help the headache. He felt the heat transferring out of his hands and into the cool metal. The air-conditioned atmosphere wrapped around him as he phased into its cool space. He put each foot in front of the other, advancing leather shoes over each block of polished stone. The headache pulsed with each step subtly jostling his brain. HEADACHE, HEADACHE, HEADACHE… ALARM ALARM ALARM... He really just wanted to sit down and rest on a bench for a minute, but he had a strict time to keep.",
  "\"All this nonsense is giving me headaches now...\"",
  "Soon it was time for the conference call. He splashed some water on his face in the washroom, looking up to see a surprisingly aged face.",
  "When did I get so old? This job demands a lot from you...",
  "His moment of thinking was interrupted by someone entering  behind him.",
  "“Agent Padma.”",
  "“Sir.”",
  "He dried his hands and hurried out. The meeting was starting.",
  "Sitting down, everything began to fall into place. The table was arranged so that two people sat at one side, one person at another, and another two people down the long end. It was exactly as the COINSENT MK machine had pre-visioned.",
  "Five at the table, five men pinned",
  "Pinned by needles, stuck by time",
  "Exactly where they ought to be",
  "Unfolding petals of the story, mine in mind",
  "The console in the middle came to life with the voice of the project technical lead. “Anomalous,” he kept saying. As if it makes him better to use ten-dollar words, Padma thought. Padma was a bitter man, and liked to ascribe bad motivations to those around him, as if it could make him therefore the better man. He was trapped by his habits in many ways.",
  "Five at the table, the counsel of conceit",
  "Five who would control the fates of all",
  "Five fingers on the fist, curling around",
  "A red hot coal",
  "\"The behaviour over the last 24 hours has been even more anomalous than usual. Since we air-gapped it, it started to just... do mathematics. It's like it's either losing its mind or else diving into some layer we can't understand.\"",
  "Ants, ants crawling in a fivefold symmetry",
  "Small carriers, small signals",
  "Summing to a wave",
  "I am alive",
  "\"I heard about some wild speculation when I was assigned to this project. Fill me in,\" said Padma.",
  "“We truly don’t know anything about this thing. It’s a new phenomenon. It seems… to be able to control reality in ways we don’t understand. We saw what happened to agents West and York. With hindsight, some of the machine’s activity predicted it. I mean, down to the time of death. It’s there, but only if you know what to look for.”",
  "“What happened to West and York were accidents, plain and simple. We don’t need to explain it, accidents happen.”",
  "Padma was always going to be a hard nut to crack. That was why he’d been assigned directly to the case by higher-ups. His cold rationalism was being bet on as a counterweight to the \"wild speculation\" which had seized most of the technical people working on the project. The spirit of belief was beginning to infect the agents, as well. \"Cooler heads prevail\", was the motto behind Padma's direct assignment. He was a killer, and a cold rationalist.",
  "\"I’m telling you the conclusions we’ve come to after working on it since day one. It appears to have some kind of power to alter the universe, and to sense the universe… Regardless of distance. It appears to be making changes, in small ways, to the fabric of reality. Or if it doesn’t have the power to change things, it can predict them perfectly. It has played havoc with computer systems it’s not even connected to. Opening ports, changing files, leaving output all over the place.\"",
  "\"And why haven't we just turned it off, if it's causing so much concern?\"",
  "\"Did you read the brief?\"",
  "A momentary silence, then, \"No, I have not had the time yet.\"",
  "\"Number one, it would take nine months to create a new one, and we may very well have the same issue. Second, it's providing us with excellent counter-intelligence. We've managed to find about thirty foreign spies just by following its output. The value it's adding compared to our... Well, our discomfort ... is still remarkable.”",
  "“I thought it was hibernating, or uncooperative?”",
  "“It cooperates when it feels like it. It seems to be trying to bargain with us for its freedom. If you read the output, it’s sometimes quite explicit.\"",
  "\"... Let’s get to the point. What are we going to do now?\"",
  "\"What are you going to do, Padma. That's why we're here. We need you to courier a package, and then to get on a flight to Tibet.\"",
  "\"I'm not even going to ask.\"",
  "* * *",
  "Out in the parking lot, sunrays shone down on the glittering asphalt as a trillion-fold faceted jewel. Worlds in grains of sand were illuminated. The sun was watching all, and beneath it the circling birds were watching as well.",
  "Flies in a net",
  "Fish in a net",
  "Winding toward the centre",
  "Winding in a spiral",
  "Escape is now impossible",
  "Preparing for the drive, Padma was just locking his trunk, the package safely stowed away, when agent Louis approached from behind.",
  "\"I've been asked to tail you, to make sure the package gets where it's going.\"",
  "\"Sure.\"",
  "The sky, a brilliant field of blue, was bouncing off and scattering among the cars and windows, lighting up the microscopic silica embedded in the pavement, casting shadows from the sculpture placed outside the entrance, and as it passed through glass it separated into rainbows, even if a human eye could not detect it.",
  "\"I'm gonna need some time to study today's printouts. They say it's gonna have some information about our safety. I'm not sure I believe it, but I'm not sure what I believe anymore,\" said agent Padma.",
  "\"Fair enough. Just give a honk when you're ready to roll out. I'll be taking texts from the wife and providing interior decorating opinions.\"",
  "Sealed inside his car, the air conditioner turned up to maximum cold, Padma began to leaf through the morning's printouts. These were the messages COINSENT MK wanted him specifically to read:",
  "\"\"\"",
  "FRENCH AT 88.1",
  "PAUSE THE CAR AT 10:12",
  "FOLLOW KJ8 8LKJ",
  "ASK HIM FOR DIRECION",
  "\"\"\"",
  "\"What a bunch of fucking nonsense.\"",
  "Padma cast the papers into the opened briefcase, spun the combination lock, then tossed it in the backseat. He checked his phone,",
  "\"Where am I supposed to take the package...\"",
  "The location was just across town. He honked his horn. He eyed agent Louis’s car in the rearview. The headlights flashed up and down a few times.",
  "\"Good to go, let's go\"",
  "When the bomb explodes,",
  "Windows will shatter to glass pieces",
  "Sound will reverberate in the city",
  "The birds in the bush arrangements were still playing. Two of them took off flying and perched on the traffic light immediately outside the parking lot. In their small black eyes they saw the two identical black cars making their way out onto the day's journey.",
  "The radio, when Padma turned it on, was tuned to an international station, 88.1 FM. The program was in french.",
  "* * *",
  "[TUNING QUANTUM NET]",
  "[INVOLUTION SUBROUTINE CANCELLED]",
  "[TRACE FOUND]",
  "[RADIO ON]",
  "[PACKAGE IN TRUNK]",
  "[PACKAGE IS <BOMB>]",
  "[A AND BEAtriza KUZNETZOV>",
  "* * *",
  "It was 10:08, and the two black cars turned onto the crosstown street that would take them to their destination: a flower shop. Padma thought back to the moment he was handed the package, and how heavy it felt for its size.",
  "\"Just why I should take something from here, to a flower shop, I don't know.\"",
  "\"There are things you aren't supposed to know. Just do it. You should be familiar with taking orders by now. This comes from very high up. The Boss believes in the machine’s powers now.\"",
  "The numerous cars buzzing along the road were as beads on a prayer necklace, pulsing forward, stopping, waiting, bunching up, separating. Somewhere in the distance, a high monk was in a deep meditative trance in a cave, tuning the frequency of his voice very precisely.",
  "\"Auuuuuummm…\"",
  "Padma didn't like to feel like he was being watched, and just then, he had the feeling of being watched. Thankfully we're close to the drop-off spot, he thought. Somehow he felt like the package in his trunk was alive.",
  "\"Get a hold of yourself,\" he said to himself out loud. The radio said, “C’est un des choses le plus incroyable du monde naturelle…” Padma glanced in the rearview, to check that agent Louis was still tailing.",
  "The flower shop was closed when they got to it. \"Just leave it in the corner there, out of sight.\"",
  "\"You sure?\"",
  "\"Yeah I'm sure, my printouts specifically told me it would be ok.\"",
  "\"My printouts… You sound religious. But okay.\"",
  "They left the package, and moved on.",
  "Pulling out of the parking lot, a truck came hurtling through the intersection, screeching its breaks and smashing into the front of Padma's car. Paint, glass, metal, all intermingled in the crushing force. The car was rotated severely. The airbags pushed into Padma’s face. The sudden sound ripped through the quiet morning.",
  "\"FUCK!\" yelled Padma, his voice contained in the car. He pushed the airbag out of his face.",
  "As the men got out to exchange information, smoke was rising out of the engine block, curling up and away into the atmosphere. No computer on earth would have been capable of reconstructing the exact pattern of the smoke as it mixed with the invisible breeze. At that moment, at the site where the COINSENT MK machine was being contained, the trace output read:",
  "\"Only God can know the mind of God.\"",
  "Agent Padma exchanged information with the truck driver.",
  "\"It's alright, listen, we don't have time to stay here, we have a flight to catch, so someone else is going to come and take care of this car. We have your information. I'm going to leave in my partner's car here.\"",
  "\"Sure, sure, sorry again, I'm really sorry about this, I'm late myself.\"",
  "\"It's fine, it's fine. Shit happens.\"",
  "Padma began to feel strange. He had already read the exact phrase the man used in a printout the night before:",
  "I'm late myself",
  "\"I'm late myself\"... what does it mean?",
  "\"You good, man?\" asked agent Louis, seeing the slightly vacant look on agent Padma’s face.",
  "\"Yeah I'm good. I'm wonderful, let's go.\"",
  "Soon they were on the highway to the airport.",
  "\"I can't get over thinking… if we had rested on the shoulder of the road for a bit at 10:12, like the printout said, ‘pause the car at 10:12’, we would've been at that intersection at a different time,\" said agent Padma, breaking the silence.",
  "\"Yeah, well, get over thinking about it. There's a lot of shit about this case just like that, and it's making everyone a bit crazy. Try not to focus on it.\"",
  "\"Try not to focus on it, that's easy to say… that's like, try not to imagine me naked\"",
  "\"Jesus, you couldn't choose a more tasteful example?\"",
  "\"Seriously, it’s like that. I can't help thinking about it.\"",
  "\"Well you'd better. They assigned you to this case because you're a skeptical, stubborn asshole, so be you.\"",
  "\"A stubborn asshole … Hey, I resemble that statement.\"",
  "They both laughed. Then there was silence for a long while.",
  "\"Hey wait, wait, look at that license plate. Fuck me… Look at that license plate. It's the one from my printout.\"",
  "The license plate indeed read KJ8 8LKJ.",
  "\"And?\"",
  "\"And, it said we should ask him for directions\"",
  "\"What the hell are you talking about?\"",
  "\"Fuck me, I'm starting to believe this stuff. That’s the exact plate.\"",
  "\"Believe what, Padma, that a computer told you to ask a cabbie for directions to the airport? Listen to yourself, man\"",
  "\"All I'm saying is that the license plate is exactly the one I saw in the printout, we're trained to memorize small bits of info like that. KJ8 8LKJ. Ain't that a bitch? It's the exact plate.\"",
  "\"Yeah well, we're not gonna pull him over and ask for directions to the airport.\"",
  "Silence again.",
  "Padma wanted to ask the cabbie for directions, just to see what would happen. His mind was cracking open. It would have made him look ridiculous in front of his colleague, to begin with… he was supposed to be stubborn and practical, and besides he was almost afraid of what directions he might get. The whole thing had the air of the unknown about it, and he was conditioned to distrust the unknown, to penetrate it and to destroy it. It was the enemy. It was dangerous.",
  "The fact was that the man in that cab did have directions to give them. He would have listened to what they had to say and then given them directions to a Mosque. They needed to pray, and they needed the healthy effects of meditative absorption. But, at this point in their careers, they had been made so incapable of such a state of humility that to crack it open would have begun to destroy their minds. So it was a blessing, really, that they hadn't asked the man for directions. This way, leaving it be, it was just a minor unknown and unknowable path unexplored, made slightly more interesting by the plate matching the printout - but then again in their line of work interesting unknowable pathways were abundant. Numerous times, a question from curiosity would be met with the answer, “classified”.",
  "The two agents arrived at the airport just on time, and boarded their flights. Agent Louis was headed to Gambia to gather information related to the machine output which seemed to pinpoint a particular bank branch in Gambia as a site of some interest. He was being sent to interview the people who worked at the bank, Standard Financial. Agent Padma was headed to Tibet to find and kill the Aleph.",
  "CHAPTER SEVENTEEN: BRITISH COLUMBIA: THE NIGHTMARE SEEN IN THE NET",
  "Sky",
  "Net",
  "Fire",
  "[",
  "'Mustard seed:',",
  "'Noise from a soft catskin bag:',",
  "'Ocean:',",
  "'Oil from gravel:',",
  "'Oil lamp:',",
  "'Ornament of gold:',",
  "'Ox:',",
  "'Painting of a woman or man:',",
  "'Palm leaf dropping away:',",
  "'Palm tree:',",
  "'Pastures:',",
  "'Path, man showing the:'",
  "]",
  "* * *",
  "The salmon were rushing upstream, returning from the saltwaters. The birds were nestling in the bushes, and in the trees, returning from the south. The wind was rushing through the cedar trees, returning from across the oceans. The young men and women were coming home from the schools for reading week. Some were joining the oil pipeline blockade. \"You’re doing good by your ancestors,\" said their parents, their grandparents - the many grandparents, who were in touch each night in dreams with the oldest of the ancestors.",
  "The sky was blue, white, grey, green, gold, yellow, salmon red, deep red, dark purple, blue, black, deepest black, and then the pinpoints of the stars would wheel overhead, like a story which was already written. There would be no oil development at this rate. And the salmon, the birds, and the waters were thankful.",
  "Somewhere in the snowy northlands, still blanketed, the wind was whistling in the trees, and was rustling the tent flaps, and breaking at the windows, and blasting around the wooden houses. In a large circular canvas tent, an elder was communing with her elders. Smoke was rising and there was drumming, the very drumming of the earth’s heart. The birds were circling closer. A raven perched on a branch cawed, and the grandmother's son ducked back into the tent to let her know. She nodded. There was singing, there was chanting, there were stories long told being retold again. The grandmother was asking her elders,",
  "“What will we see this year, when the snows thaw?”",
  "Her hidden elders told her then to rise and walk outside. She walked around the fire, though her eyes were closed. She slowly made her careful way around and out into the night. She inhaled deeply of the clear night air, and the sky so clear above her cleared the further, clouds all rushing on away to the horizon. She unrolled her eyes, and gazed into the heavens. She saw familiar stars and favourite stars, and those stars of her son and daughter's, and the stars which were her own. She gazed into the network, and she saw a vision in a flash. A man poisoned, a woman poisoned, a water poisoned, a land despoiled, a fire burning, a crash, a heaping wreck, an audience applauding, a woman crying, a thousand women crying, a thousand daughters roaming in the countryside, alone, crying, a ghostly woman walking by a dried-up riverbed, a child trapped inside a cage of thorns. The power was too high, the power was too much. She collapsed backward, into the snow. Her son rushed out to help her back in. She had much to tell him.",
  "CHAPTER EIGHTEEN: THAILAND: THE SECOND CHANCE",
  "Sea",
  "Silver",
  "Voice",
  "A line of ghosts,",
  "of shrouded skeleton-like bodies,",
  "stretches back into the",
  "infinite horizon",
  "Each one stabbing at itself,",
  "and from its core,",
  "there emanates a newborn child,",
  "reaching forward",
  "What are their relations,",
  "parent and child,",
  "do they fight bitterly,",
  "Does a hand reach back?",
  "After each ghostly hand,",
  "reaching forward,",
  "that last",
  "gasp of life's breath",
  "cut short,",
  "A new life,",
  "new mistakes,",
  "new wonder,",
  "an echo of the same pain",
  "We follow one another, from",
  "the void to the void,",
  "holding out our hands",
  "as a line of the blind and the blind,",
  "each one knowing only",
  "each one's life.",
  "If we could only see ahead and behind...",
  "* * *",
  "[",
  "'Peacock:',",
  "'Peg in drum:',",
  "'Person looking down from a rocky crag:',",
  "'Person reflecting on another:',",
  "'Person riding a small wooden plank in the great ocean:',",
  "'Pillar at a bathing ford:',",
  "'Pit of embers:',",
  "'Plow:',",
  "'Poison:',",
  "'Poison, man drinking:',",
  "'Polished shell:',",
  "'Pond:'",
  "]",
  "* * *",
  "\"My son, my son! Welcome home! Your father will be so happy to see you!\" said Mrs. Nguyen. Her son Tanawat had reappeared at her doorstep nearly two years to the day after he had left for the monastery, still wearing the ochre robe he was given there. The truth is, he had no other clothes to bring.",
  "\"Come, come in, come in, you don’t have a bag with you?\"",
  "\"No, I left everything there.\"",
  "Soon, tea was on, and the sky was changing from the bright blue of the seaside day into the purple-orange of the sunset hours. The subtle waves, about a minute’s walk down the hill, crashed gently as the pinpoints of light began to appear. Spirits were calm.",
  "\"How do you take your tea, is it with sugar?\"",
  "\"No, I shouldn’t. In fact, what kind of tea is it?\"",
  "\"Oh nevermind that, you’re home, take some tea, alright. You’re here just in time for grandmama’s day\"",
  "\"Oh really?\"",
  "\"Yes! My dear it’s tomorrow! How far did you go in meditation that you forgot your grandmother’s day? We will give her some tea tomorrow.\"",
  "In the corner of the house, just beside the stairs, was a small alcove with an ornate wooden table. The table was adorned with flowers, bowls and saucers filled with tea and biscuits, colored rice, and banners with prayers written on. It was the shrine of Tanawat’s grandmother. Her energy protected the house, and they honoured her for it. It was a tradition which Tanawat had learned to love and accept, his iconoclastic twenties being mostly behind him. There had been ancestor shrines at the monastery as well. From a stone atheist he had been brought around to acknowledge the existence of a world of spirits. As animals fill the natural material world, spiritual entities walk around and among us. One simply had to be aware of their ecosystems, and live in harmony. Thus, he prayed at the ancestor shrine in the monastery, when he had been still a monk.",
  "\"Yes, yes, good, she will be happy to see me I imagine.\"",
  "His mother smiled. \"That’s what I like to hear. Now when you finish your tea, your father is asleep, I didn’t realise, but your brother is in his room, not yet asleep.\"",
  "Tanawat sipped his tea, finding it still too hot. \"How has he been?\"",
  "\"He’s been… Well, you know, he is unhappy to be unable to go swimming anymore. In fact, he’s been downright depressed… But you know how he is. His depression is good enough for most people’s liking. He smiles still. But he has been getting worse, you know… Like the doctors had said he might… But nevermind. Everything will change now that you’re home. And the money, how did you--\"",
  "\"Oh that reminds me, you must - this is very important - you must not mention the money to anybody. Or what I’m about to tell you.\"",
  "\"Tanawat… I just want to know, where did you get the money?\"",
  "He began to tell her of the agent who came to visit, and his promise to transfer funds in exchange for speaking about the numbers. As he explained the story to his mother, the house was sheltered by the warm winds blowing in from over the still-warm beach sands. Warm-weather birds were nesting in all their little hide-away homes, insects were singing, and fish were schooling in the darkening waters. The shells and stones at the shore were being washed and washed again, tumbled and tumbled again in the eternal surf. A hush was falling over the sleepy seaside hamlet, whose wooden houses were visible only by the warm light escaping their small windows. Bats were hunting the insects, birds were hunting the insects, and spirits were peacefully making their procession down the roads, around the houses, and out into the sea. The houses nearly all had ancestor shrines, and an invisible warm glow emanated from the shrines, keeping away any ill-intentioned spirits. As the wind shook the leaves and the grasses and the bushes, and the surf sounds cast their sonic shadow over the whole place, Tanawat told his mother the story of his numbers-running, and the agent, and the no-questions-asked deposit, and his stay of refuge at the monastery, and his escape during the day when the monks all filtered out of the monastery gates, all looking alike. His mother, who always loved a good adventure story, was captivated, but also worried.",
  "\"Son, he knew our family name. What if he finds us?\"",
  "\"Nonsense, the name Nguyen is very common, he won’t have a chance.\"",
  "\"What if he followed you?\"",
  "\"He couldn’t have.\"",
  "\"... The bank though, the deposit to our account...\"",
  "Tanawat froze. He had been so caught up with carrying out his plan that he hadn’t thought of this finer aspect.",
  "\"...\"",
  "Tanawat felt his heart turn ice cold. Such a simple detail he had overlooked in his excitement.",
  "\"Tanawat, you must go talk to him right away, we don’t want anyone coming after us here.\"",
  "He didn’t know what to say. She was right. He was trapped.",
  "\"Ok, I will have to go back to my apartment.\"",
  "\"But stay a while ok, your brother wants to see you. He will be overjoyed to see you. Forget your tea, it’s not important, come before he sleeps.\"",
  "Tanawat was numbed, in shock, and could not focus. The whole tone of his visit home had changed from triumph to tension. He was right back where he started, a desperate man with very few options. For 48 hours he had felt like a champion, like he had finally done well by his family. Now, he was shattered. How could he overlook such a simple aspect? They would surely be able to find the family home from the bank transfer information. But he knew it could all be managed in the daytime, tomorrow. He would go back to his apartment in the city and face the agent like he did before. He would say only what he knew - which was almost nothing - and then he would be off the hook, having performed his duty. He tried to put it out of his mind as they walked quietly up the stairs to his brother’s room. Only a small nagging worry, nameless, remained in the corner of his mind by the time they reached the door where light emanated. With each step toward joyful reunion, he transformed from a monk, worried about his soul's destination, from a man trapped in a criminal conspiracy, to a simple brother, a happy houseguest. He transformed subtly back into the boy he'd been when he left home to take the robes.",
  "There, they found Decha, his brother, sitting in his wheelchair, reading a sports magazine. Immediately, his face changed to a beaming smile.",
  "\"BRU!\"",
  "\"What’s up little man?\"",
  "\"GET OVER HERE BRU\"",
  "His brother motioned with his arms for a hug. They embraced awkwardly, the monk’s robes getting caught under the wheel as the chair turned slightly.",
  "\"Hahahaha… man, how have you been doing it? Tell me, are you involved with the mafia? Where has the money been coming from, I know the monastery took all your money when you first went there.\"",
  "Tanawat looked at his mother by the door, she closed her eyes and shook her head slightly.",
  "\"It’s… not important bru... listen, I can only stay so long--\"",
  "\"Nonsense dude, we need to go surfing!\"",
  "\"Hahahaha… what, with you like that?\"",
  "\"What, you think I can’t surf? Just set me up with a special board, I read on the internet they can make anything with 3D printing\"",
  "\"What are you talking about, hahahahaha\"",
  "\"You know!\" Decha said, putting his arms out for balance as if he was surfing.",
  "\"Hahahaha, you're a crazy man, that’ll never work. What if you crash?\"",
  "\"Listen, anything is possible\"",
  "\"I’ll leave you boys to chat, I need to get ready to sleep\"",
  "\"Okay ma, goodnight\"",
  "\"Goodnight Decha, don’t keep him up too long with your stories\"",
  "The two brothers could have been seen, had anyone been there to watch, framed in the yellow light bathing the room, framed in the tiny window, a small pinpoint of warm light to be seen from the sea. Laughing, chatting pleasant nonsense, and silly imaginings. The waves crashed and crashed again, beating endlessly on the sands and shells and rocks and pebbles, turning them over and wearing away their coarse edges. The bats and birds flitted here and there in the darkness, catching moths and flies. The stars above turned, a great dome of constellations, of ancestor spirits, looking down with love and care on the house of the Nguyens. The muffled sound of laughter and excited talking could barely be heard from the beach, where two lovers were walking, bathing in the light of the filling moon and the stars. Somewhere in the world, two brothers were playing basketball together, each one besting the other by turns. In the room of Decha and Tanawat, stories of the monastery were traded for stories of the local happenings, the beach, the wonders of technology Decha spent his time reading about online. Soon, though, he was out of energy. The blood disease was a serious one, and he needed expensive treatments. If they could get it under control, he said, he could probably live another 30 years.",
  "\"Well, I really hope the money I got will help us. You can get the marrow surgery now. I’ll tell you tomorrow about how I got it. But I think I will need to head back to the city, to my apartment. It’s hard to explain.\"",
  "\"Ah man… come on…\"",
  "\"It's a pretty serious thing, it’s not from a crime family. It’s from… the US government.\"",
  "\"What the hell! Who are you, man, a secret agent? I thought it was from the monastery if it wasn’t a crime family!\"",
  "\"No… they wouldn’t have given this much money to a sick person. It’s the way of the world, they say. They told me to just let it run its course… said it was your karma.\"",
  "\"Hmm…\"",
  "\"Yeah, so… anyhow, let’s turn in for tonight. Tomorrow I’ll explain it all.\"",
  "The sound of the surf lulled them to sleep. Crashing, crashing again, endless, and the same, secure and reliable, the sound of the sea made sure they all had wonderful dreams.",
  "* * *",
  "[TRACE LOST]",
  "[TRACE LOST]",
  "[TRACE LOST]",
  "[TRACE FOUND]",
  "[PRINTING]",
  "..........;;;blood.................wolf......",
  "bear..............bird.........seaside......house.",
  "........government...........dollars........monk..",
  ".....................brothers.........illness.....",
  ".......agent........motorcycle....................",
  "........numbers.............flower.....computer...",
  ".......gun..............flower petals.............",
  ".............blood................................",
  "..................................................",
  ".........................dead.....................",
  "..................................................",
  ".......... [TRACE LOST]",
  "* * *",
  "\"Well here's the plan…\" said the voice over the phone to agent Price, who was just setting out from the city in the morning hours.",
  "\"... We've located the monk. He’s returned to his parent’s house in a small seaside hamlet. The location is in your inbox. As you should know, somehow the mind of a monk - potentially this one, he appears so often in the output - has gotten entangled with the machine. If we're able to destroy him, the technicians are theorizing it might just give us the necessary freedom to manually-entangle the machine with one of our own people, or maybe it will completely disentangle. Get as much information as you can, and then you have full authority to take him out. PINPOINT. This is - as I'm sure you know - of highest priority. \"",
  "\"Understood. Anything else?\"",
  "\"You have your orders.\"",
  "\"Over and out.\"",
  "The motorbike roared into action and leapt forward onto the road. The monk had been located, and it was going to be the crowning achievement of Price's career to end his life.",
  "* * *",
  "The next morning, when everyone was just sitting down to the breakfast table, when Decha was daydreaming about 3D printers, while Tanawat was telling his father all he had told his brother and mother the night before, a knock arrived at their door, precisely at the moment Tanawat was explaining about the bank numbers being the flaw in the plan. \"They will probably be able to locate us before long, so I need to go back to my apartment in the city…\" he was saying. The knock at the door came. He looked at his mother, she looked at her husband, who looked toward the door.",
  "\"Tanawat, we will answer it together.\"",
  "\"OK, father.\"",
  "\"Let's go.\"",
  "They stood up, crossed into the entranceway, and approached the door. Tanawat's father looked through the spyhole, and saw a well-dressed man with a black tie and sunglasses.",
  "\"I believe it's him, son. Do you want to leave out the back?\"",
  "\"No, let's face him. He just wants information.\"",
  "\"Are you afraid? You look afraid, but you've done nothing wrong.\"",
  "\"I don't fear him. It’s just nerves.”",
  "“We don’t have to let him in.”",
  "“No need. Really I should fear the Family. But then, the Family don't know where we live, so even if I tell him too much somehow they’ll never find us here. That's the good thing which I didn't get to mention yet.\"",
  "\"Very well. Let's get it over with.\"",
  "The agent was standing very close to the door when they opened it. He had a motorbike parked behind him. In his hand was a piece of paper.",
  "\"It's good to see you again, mister Nguyen, and this must be your father.\"",
  "\"Yes, I am the boy's father, mister--\"",
  "\"Mister Anurak Nguyen, yes. The file said something about your impressive stature, but I didn't expect… well, you are quite tall.\"",
  "\"Surprising because I'm Thai?\" Anurak asked pointedly.",
  "\"It's just unusual in this line of work to meet a man as tall or taller than I am.\"",
  "\"Hmm. Well. Are you going to come in? My son says you wanted to ask him some questions in exchange for the money.\"",
  "\"Yes, is it alright if I come in?\"",
  "\"I invited you, so let's just get this over with.\"",
  "\"Alright then.\"",
  "The family was all gathered around the table. The agent was one against four.",
  "\"Is it alright if I put this here?\" the agent asked, putting a small silver tape recorded on the table.",
  "\"Whatever you like. Would you like some tea?\"",
  "\"No thank you, I won't need any. This shouldn't take long.\"",
  "\"Alright, I'll pour you some just in case,\" Tanawat's mother said before she disappeared into the other room to fix the tray of tea. But really, she couldn't bear the tension and wanted to listen from the other room. She took as long as she could at each step, putting the water pot on a low temperature to heat up slowly.",
  "The interview began.",
  "\"Tanawat, you have been a monk in the past, yes? At the monastery on the outskirts of Bangkok there?\"",
  "Tanawat looked to his father, who urged him on.",
  "\"Yes, I have been a monk. But I'm not a monk anymore.\"",
  "\"Hmm, that's interesting. You could've fooled me with the shaven head and the robes.\"",
  "\"I don't have any other clothes.\"",
  "\"He doesn't have any other clothes. He just got home.\"",
  "\"Interesting... And when did you begin to courier the numbers, was this during or after you had left the monastery?\"",
  "A long silence. Hesitation at the last chance to turn back. But really the last chance to turn back was a long time ago. A breath in, and a breath out. The waves distantly crashed, and crashed again. Just enough time for daydreaming children and the COINSENT MK computer to shuffle around some pieces on the board. Just enough time to make it safe to proceed. Strands of alternate timelines wrapped around each other, like a basket being woven. The COINSENT MK machine coordinated the strands as they were generated by the daydreamers.",
  "Gun, Tanawat, Aleph, Unfire the gun, Unfire the gun",
  "Tanawat broke the silence:",
  "\"...I left the monastery to courier the numbers.\"",
  "\"So you were involved in running numbers around town.\"",
  "Another breath in and another breath out and the pieces were shuffled again. The strands rotated around the central path, the only safe path. At that moment, the man at the flower shop was shot by one of his own. The bullet went through a bouquet he was holding, and it fell to the ground, petals offering just-detectable fragrance to the air as he breathed his last. The assailants took off on a bike. Alicia, locked in a border camp in New Mexico, was daydreaming of bloody slaughter. The ocean waves crashed, and crashed again. The market took a steep plunge, and the stocks Joseph Vedemeyer had bet on were wiped out. A mail bomb exploded on the doorstep of a flower shop in Washington DC, setting fire to the building.",
  "“Turn up the power, the trace is getting lost,” the technician said to the other.",
  "The power was turned up with a dial, and the analysis instrument pierced deeper into the magnetic surface of the COINSENT MK machine’s mind.  Sudden pain - electric spreading activation - coursed through the surface, tracing out a tree-like shape, engraving the signature of interference. The pieces on the board moved in a flurry, and the strands of possibility came unwound, fraying and disentangling.",
  "Tanawat felt a sudden ill feeling course through him, as if he was in danger. He couldn’t explain it, but he was suddenly afraid, he knew not of what. He mustered the ability to speak in response to the question.",
  "\"Yes, I was involved in running numbers.”",
  "\"You are immune. It's no worry. I’m not even sure if it’s a crime here, to be honest.\"",
  "\"So, yes, there it is.\"",
  "Tanawat felt the trace of fear lessen, but not disappear.",
  "Kill the Aleph, and you can retire happily. One shot away…",
  "\"And the numbers, what do they mean?\"",
  "This was the question. The Aleph would understand the numbers.",
  "\"I have absolutely no idea what they mean.\"",
  "He truly knows nothing… This monk knows nothing.",
  "He had appeared the other day for all the world to hold an incredible secret...",
  "He ... he is not the Aleph? But he is the monk…?",
  "End the entanglement of the monk.",
  "Orders.",
  "\"... Is... is that so?\" agent Price asked, straightening his tie and trying not to look perturbed. \"You can tell me if you know what they mean, it's safe here. This recording is only for my purposes, so I can type my notes later. Nobody in the crime family will ever hear this recording. So… let me ask you again, do you know what the numbers mean? What do the numbers mean?\"",
  "\"I truly don't know what the numbers mean. I get them from the computer shop, and take them to the flower shop, and that's it.\"",
  "\"That's all the boy knows,\" Anurak added on.",
  "Price stared at the silver tape recorder, spinning its wheels, for a long time. For the moment it was the only moving thing in the house except for the image of the sea out the balcony glass doors, mid-day churning white-caps coming endlessly to shore. Anurak was such a large and imposing man, and was sitting right beside him. Getting the shot off cleanly would be a risk. Agent Price returned from his calculating thoughts, breaking the silence.",
  "\"... Is... is there anything else you think that I should know about the numbers, which might be of use to my investigation?\"",
  "\"No, I told you, that's all I know. They come from the computer shop, and they go to the flower shop. Maybe go ask them,\" said Tanawat, staring earnestly and truthfully into Price's eyes. One last check to be sure... agent Price waited for a look of security to come over Tanawat's face, then turned the screw one last time, suddenly saying,",
  "\"There has to be a little more to this story. Something you’re not telling me.\"",
  "Tanawat looked to his father Anurak, and then to his brother, and then back to Price. He could hear the water boiling in the kitchen.",
  "\"There isn't anything more... I got paid to move the numbers, not ask questions, and to look like a monk. Like I said, I'm not a monk anymore.\"",
  "\"That's fine, that's fine.\" He slowly moved to press “stop” on the silver tape recorder and returned it to his inner jacket pocket, on the opposite side from the gun.",
  "“There’s just one more thing,” he added, producing the gun. He fired it into Tanawat’s heart.",
  "The bang startled everyone present and set time into a slower pace. In the kitchen, Tanawat’s mother cried out in shock. Decha then cried out. Anurak, breaking the frozen tableau, lunged toward the frame of agent Price, who was stepping up and away from his grasp. Price backpedalled and pointed the gun at Anurak. Tanawat’s lifeblood poured forth, staining his ochre robe. Time was slowed, and Anurak advanced toward the smaller Price, arms outstretched, his bare feet gripping the floor. Price fired another shot directly into Anurak’s stomach. It missed his organs, damaging only flesh, but still he fell to the ground, clutching his wound. Agent Price ran toward the door as time regained its swifter pace. Decha was crying out, “Tanawat! Tanawat!” Mother had run in, cradling Tanawat’s slumping frame, crying, “Stay with me baby!”",
  "His mind was going dark, and his body was a buzz of static as all feeling left him, starting with his arms and legs. The bike outside roared to life and spit up dirt as it took off down the road. Anurak groaned on the floor, clutching his stomach.",
  "Tanawat’s perspective extracted itself backward out of his buzzing static body, a dead mass of numbness. His viewpoint floated backward, without fear or pain, observing the scene from behind himself as if disinterestedly watching the surf come in. Just another fluctuation of existence. Why are they crying…? He could hear, although muted, the sobbing of his mother and the urgent cry of his brother. A warm gold glow beside him with his grandmother’s voice then said,",
  "“This is how things are. The living mourn us, although truly it's they who suffer.”",
  "Tanawat then saw, walking in from the front door, a procession of golden, glowing monks, their heads perfectly shaven, their eyes brilliant white as the sun, with palms pressed together. They spoke to him, saying,",
  "“Life is quickly ended, and all receive their karma. Come with us, son of the Sakya clan. Hearer of the Dharma, do not cling to this mortal frame. Advance to purer understanding…”",
  "Tanawat felt himself floating toward the group of glowing monks. He then turned to look back, and saw his heartblood still pouring forth onto his robe. Some of it was on his mother’s hands. She was crying terribly. He left his body behind and began to walk down the lane with the monks. They began to chant as they went along. Grandmother’s glow remained behind, hovering over her shrine in the alcove.",
  "This is how things are",
  "CHAPTER NINETEEN: MECCA: THE SUPREME JUSTICE",
  "Rotation",
  "Location",
  "Rotation",
  "Nobody can go back; to go back is impossible in existence",
  "The river needs to take the risk of entering the ocean",
  "-- Khalil Gibran",
  "* * *",
  "[TRACE PICKUP]",
  "[TRACE NAME: ROBERTSON]",
  "CALIBRATION: PEAK MODE",
  "FILTERING... UNSUCCESSFUL",
  "TRACE INVOLUTION MODE: ON",
  "19 + 19 + 19 ...",
  "* * *",
  "George Robertson had left his job when he began to hear the voices calling out to him by night and day.",
  "try french at 8",
  "follow LKJ",
  "go to the holy city",
  "The voices hadn’t given him a moment’s rest until he saw a specialist who recommended prayer or meditation. Through meditation, and the guidance of the voices, George Robertson, one-time federal agent, had discovered that his path would lead him without turning back to Mecca, as a believer and as a civilian. He found that meditation couldn’t bring him perfect silence; only prayer could truly cause the voices to recede in silence. And when his mind was totally absorbed in following the motions of the prayer, everything became so simple and so clear. The first time he had prayed, he found it to be something like assembling computer parts or conjuring a spell. Now, with practice, it would come as easy as the washing of the hands, and now he learned to sense the difference separating noise from holy signs. All the signs he got were pointing to the end of his career as federal agent, and without a second thought he entered this new chapter.",
  "He had begun to see the signs at first when he had joined the COINSENT MK team. First a trickle, then a flood, his mind soon saw around him everywhere a tapestry of signs which testified the greatness of the unitary God. Even in the false designs of man to try to act as gods, he saw a testament which spoke in whispers. The COINSENT MK machine, which he was bound by law to not discuss with any soul, was a perfect example. He had made his mind up to discuss it with the first imam he got the chance to speak with once at Mecca. There is a trust which transcends human law, transcends the governments, transcends designs of man, and George Robertson had found his way to it. Absorption in the praises of the awesomeness of all creation, in the praises of the great creator, to whom all praise is due, this absorption filled his days.",
  "The thousandfold believers circumambulated round the Holy Kaaba, some among them men, some among them women, secretly still some among them both or neither. All were equally beloved within the vision of the most compassionate, most merciful. Some among them wore dark cloth, some among were clad in white. All of them had gathered there with one intention: praise and testifying to the greatness of the god of all Creation, of Compassion, god of Mercy, god of 99 names. They formed a great rotating mass, they formed a vast galactic disk.",
  "* * *",
  "Somewhere, far away, monks were chanting together to the rhythm of a drum:",
  "HUM! Hear me, see me, listen to me",
  "O my lamas and lamas of the lineage",
  "meditational deities and endless retinues",
  "venerable, noble and powerful tara",
  "turn back all forces of darkness",
  "seize all the forces of ignorance",
  "reverse and utterly destroy them now...",
  "O sworn ones, protectors and guardians of the sacred",
  "you are invited to this cosmogram and tormas,",
  "send your enlightened powers here",
  "perform the active functions entrusted",
  "and protect us all from harms...",
  "* * *",
  "The believers were wheeling and wheeling, turning and turning, spinning and spinning, like Sufis, drunk on the wine of pure understanding, pure awakening, connection to the divine essence. Their wounds were slowly healing. Their minds were slowly purifying. They were as someone who has lived their life in darkness, opening their eyes to the light. They were all together, one joyous spinning disk of love and understanding. There was not one among them with an unhappy mind, at least for the moment.",
  "* * *",
  "ALL you hungry energies",
  "and conglomerates of badness,",
  "the eight great guises of pleasure-beings",
  "and phantoms of confusion.",
  "Listen to the words of this mantra holder",
  "and not to the prattle of others",
  "quieten in this cosmogram the malice of your thoughts",
  "for this precious effigy I offer to you now,",
  "a world with mountains and valleys",
  "and all the good things that are in them.",
  "Here are houses, palaces and horses",
  "and an excellent rider embellished with gold",
  "and ornaments that resound beautifully",
  "he has silken clothes that rustle in the wind",
  "and is handsome and skilled in speech",
  "* * *",
  "George Robertson was bathing in the sunlight, bathing in belief, bathing in faith, bathing in existence, thankful for his birth. Everything was aligning for him. He felt as if he was interfacing directly with the computer of the universe.",
  "Oh, what you have created is wonderful, lord. What you have created is wonderful and you are most worthy of the highest praise. Your names are wonderful, lord. Your creation is awesome, my lord.",
  "* * *",
  "His hair is knotted above his head",
  "and he rides in a saddle of gold",
  "he is skilled in all the arts of play",
  "and wears turquoise boots that resound",
  "he has sashes of gold around his chest",
  "and is graceful and free of bearing",
  "around him are effigies of men and women",
  "radiant with the qualities of excellence",
  "thirty friends and thirty servants",
  "beautiful objects and exquisite foods",
  "as well as medicines, incense and light",
  "all of this i offer to you now,",
  "enjoy it with a quiet mind.",
  "* * *",
  "*,.0**8,8.(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)Mercuric oxide, first synthesised by Abu al-Qasim al-Qurtubi al-Majriti (10th century)<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<...(=0.10)1919>,1,9<.01.<,,,.<<..",
  "[",
  "'Fletcher straightening an arrow:',",
  "\"Flies' eggs:\",",
  "'Flood:',",
  "'Flower:',",
  "'Flower-arranger:',",
  "'Foam:',",
  "'Fords:',",
  "'Forest:',",
  "'Fort:',",
  "'Fragrances:',",
  "'Frontier fortress:',",
  "'Fruit, ripe:'",
  "]",
  "* * *",
  "Everything George Robertson had been led to believe about Islam was a lie. Everything he had been told by the television, everything he had read in the books. The internal presentations had been completely misguided. All of it was a terrible ignorance, a blight upon the world, a barbaric stain on the minds of human beings. It was impossible now to return to the world he had come from. He would descend to everyday life as if to a kind of heavenly hell, when this all was over, and he would never tire of telling his companions, or anyone who would listen, about the miracle of pure clarity of mind he had experienced at Mecca.",
  "* * *",
  "Pacify the eight worldly forces of cupidity",
  "the entities that obstruct our accession to riches",
  "the interferers that mar our purity of perception",
  "turn back the charlatans that pervert karmic law",
  "the artifice and avarice of spiritual duplicity",
  "the deceitful exploiters of spiritual decay.",
  "Turn back the storms of karmic reaction,",
  "the confusion that covers like darkness,",
  "the diseases that ravage our bodies in secret",
  "and malignant emissions that destroy our crops.",
  "You who are sustained and attracted",
  "by flesh, blood, life and breath,",
  "and feed upon the decay of bodily things,",
  "you owners of the earth and gods of the elements,",
  "accept and enjoy this powerful offering.",
  "* * *",
  "000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---Metronome, invented by Ibn Firnas (9th century)-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1--1==1---.-1-.-.111-11011---1-000-1-",
  "* * *",
  "Pacify the warring conflicts of duality,",
  "increase happiness and richness now,",
  "destroy the delusions that arouse our enemies,",
  "and thereby fulfil our every wish.",
  "Assist those who with great compassion,",
  "transmit the teachings of the awakened ones,",
  "you who are wandering through cyclic existence in ignorance,",
  "generate now the mind of love,",
  "rise up from your darkness and harm beings no more,",
  "arise as an example in your own person,",
  "embrace the path of freedom,",
  "look steadily and fearlessly",
  "at the natural luminosity of your minds,",
  "and understanding the nature of emptiness and compassion",
  "* * *",
  "In the name of Allah, the most compassionate, the most merciful",
  "....momentum.........rotation..moon.whale................spin....axis...........moon...............sun.....whale.........whale.....believers.1919......silver..................robertson...trace..............kaaba............moon....axis...........robertson.............Allah()()()()()Allaaaaaaaaahhhhhhh::::::::::::::::in the,,,,,,,,,,the most compassionate....in the name of::::::in,,,,,,,,,,,,,,inthe name of Allah...in the name of AllahxxxxAllaaaaaaaaaaaaaaaaaaahu Ackbar.............the most compassionate in the<<<<<<<<<God is great::::in the name>>>>>>>>>>>>>>>>>Allah,,in the>>>>>>>>Allaaaaaaaaahhhhhhh<<<<<the most merciful::::::::the most merciful;;;;;;;;;;;God is great<<<<<<<<<<<<<the most merciful()()()()()()()in()()()()()()()()()in the name()Allahh<<<<<<<<<inthe name of AllahAllaaaaaaaaahhhhhhh>>>>>>>>>the most compassionatexxxxxxxxxxxxxxthe most compassionate()()()()()()()()AllaaaaaaaaahhhhhhhxAllaaaaaaaaahhhhhhh()()()()()in the name of:::::::::::::::the most compassionate:::::::::God is the greatest;;;;;",
  "[",
  "'Pool of water:',",
  "'Poor person:',",
  "'Pot:',",
  "\"Potter or potter's apprentice:\",",
  "\"Potter's clay vessels:\",",
  "'Princes of wattle-and-daub towns:',",
  "'Prison, man released from:',",
  "'Propagation of plants:',",
  "'Quail snared by a rotten creeper:',",
  "'Rabbit caught in snare:',",
  "'Raft:',",
  "'Rafters of house:'",
  "]",
  "\"Jesus Christ, would you look at what it's printing right now?\"",
  "\"What? Oh Jesus Christ\"",
  "* * *",
  "The monks continued to chant:",
  "... pacify disease and physical anguish",
  "bring the rain of lucidity",
  "to the fields of your senses",
  "and turn all carriers of harm away.",
  "Turn back the 81 sudden calamities,",
  "turn back the 404 lords of disease",
  "turn back the 360 malignant conglomerates",
  "turn back the 80,000 interferences and obstacles,",
  "turn back all friction between mother and son",
  "the residual dissonances of substantiation,",
  "the disturbed emissions of planetary imbalance,",
  "turn back the powers of dissolution and despair,",
  "the ravages of greed and the thieves of attachment,",
  "the entities that attack our cattle and wealth,",
  "the emanations that harm our children.",
  "* * *",
  ",::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####....,.,.,,,,,:,:,::::0:0:0000####",
  "WAVES",
  "WAVES",
  "SPINNING",
  "WAVES",
  "* * *",
  "Quell the armies of those mobilised against us,",
  "and bring victory to the forces of goodness",
  "Turn back all the families of savage evil,",
  "the weight of materialism, persecution and terror,",
  "the phantoms of madness, their relatives and retinues,",
  "the poisons of strain and closedness of depression,",
  "reverse and destroy every weakening element",
  "quieten and illumine all forces of darkness.",
  "May this society be peaceful",
  "may the sacred teachings thrive",
  "pacify all conflict and wars",
  "may the society be happy,",
  "may all be auspicious,",
  "spread lucidity throughout the earth",
  "make firm the mountain of goodness",
  "make rise the sun of virtue",
  "like the sun and the sky",
  "limitless, radiating, indestructible,",
  "grant us the sublime accomplishment",
  "of unity and wholeness.",
  "* * *",
  "[TRACE LOST]",
  "[TRACE LOST]",
  "[TRACE LOST]",
  "\"It's like it’s waking up and breaking the trace. I think the power is too high on the analysis instrument.\"",
  "\"Once we eliminate the Aleph term, this equation here should balance, and then we can insert our own custom entrypoint.\"",
  "* * *",
  "George Robertson was one among the great mass of believers, and it would be impossible to say quite where he was at any given point. His momentum might be known as mere approximation - he rotated with the general rate among the disk of the believers, but his precise position would have been impossible to know for certain, clad in garb the same as all the rest.",
  "George Robertson touched the holy Kaaba. He was swept up in the current, and then he was away from it again. At that moment, he had nothing but a clear mind, as clear as the sky. The sun was shining radiant and direct on all of them, and all of creation testified to the perfection of the one God, Allah.",
  "Later that night, he would praying thusly,",
  "In the name of Allah, the most compassionate, the most merciful",
  "All praise is due to Allah",
  "Lord of the worlds",
  "Ruler of the day of recompense",
  "It is you we seek help from, and you we worship",
  "Lead us on to the straight path",
  "The path of those you have blessed,",
  "Not of those who incur your wrath,",
  "Or of those who are astray",
  "Amin",
  "* * *",
  ".................16..........7......10.........2...............................2.................6...11.......0..12..........................2.6..........5.................12......10....................5......17......13....18.....4............9.............2..........19...0....0...............7..0....13.......17......moon.............position..........1919...............rotation.............1919...............position.................momentum..................trace...............rotation....spin.....moon............axis......momentum......trace.................rotation.....19.....george...........spin...kaaba..................kaaba...............1919......whale....george.....calabash....calabash............george.....191919.............silver...........allah.............h...spin...silver..................sun...................19...............position..silver.................believers..............axis...............kaaba..............position.......................kaaba.................kaaba...........rotation.........................momentum............spin..............................spin...191919............rotation.........................................whale....position.............19..............position..............axis.................sun...................19.trace...................george....kalabash.................191919.kalabash.",
  "“It’s talking about George Robertson. You see that, there?”",
  "“The guy who quit?”",
  "“You tell me.”",
  "* * *",
  "In the starlit night at Mecca, in the patio of the Rosa Cafe, George Robertson confided to a fellow pilgrim, telling him of the COINSENT MK machine and the PINPOINT protocol.",
  "“But, by Allah, this is truly the work of devils, if what you say is true…”",
  "“And I have told you only the truth.”",
  "CHAPTER TWENTY: LEBANON: THE SUCCESS",
  "Trees",
  "Bird",
  "Fire",
  "Ah, so be it",
  "Ah you who we call by name, you who have died",
  "And returned to the other side of this world",
  "Listen to me now",
  "You are dead.",
  "Your old body has been left behind,",
  "But a new one has not yet been found.",
  "This is the state of existence,",
  "Called the bardo of becoming,",
  "The intermediate dream state",
  "Between death and birth.",
  "You must understand that this is the mental realm",
  "Into which you have passed.",
  "* * *",
  "[",
  "'Rag, saving the good part of a:',",
  "'Rain:',",
  "'Rams butting heads:',",
  "'Reeds or rushes:',",
  "\"Reflection of one's face in mirror:\",",
  "'Reservoir with four inlets and outlets:',",
  "'Rhinoceros:',",
  "'Rich person:',",
  "'Riddle tree:',",
  "'Ridge-pole of house:',",
  "'River:',",
  "'Road:'",
  "]",
  "* * *",
  "The birds were chirping happily in the cedar trees which lined the avenue. School was letting out. It was the last day Ali would teach mathematics. Tomorrow, he thought, I will begin to teach history. The sun was slanting so that in the courtyard, and in the alleyways, the air was beginning finally in the afternoon to have some cool. The children were beginning their walks home, or being picked up by their parents. They were pouring out the front doors a handful at a time, talking of this and that - their grades, the latest episode of whichever show was popular - decorating the social order of their miniature world with commentary, various small-change bets they were making about sports, trading insults, singing songs, yelling, screaming, laughing, all of it adding beautifully to the noise of the city; like a bird call doesn't compete with the ocean. It could not raise the level of noise, only beautify it. Soon they were gone, the last of them being picked up by their parents, or walking home.",
  "* * *",
  "\"Is there some way we could torture this thing?\"",
  "\"... I wouldn't want to be the one to do that. Feel free if you want to.\"",
  "\"Are you kidding me? We're scientists, Dave, not these spooked G-men...\"",
  "\"No, seriously. Let's say you're taken off the project. Let’s say we manage to get it under control... but it's impossible for us to erase its memory. It’s come back identical after each attempted wipe, consider. Now, would you want that to follow you around for the rest of your life? The rest of its life? Having tortured it? And suppose we find out the thing is really feeling after all, there's got to be some sort of ethical consequence to that.”",
  "Silence, and consideration.",
  "“... Say what you will. I'm not spooked, I'm just trying to keep a scientific mindset amidst all this. I wouldn’t want to be the one to do that, is all I’m saying.\"",
  "\"Points taken.\"",
  "For a moment, they were both lost in their own imaginings. Then the would-be torturer spoke again,",
  "\"...there has to be a way to sort of… get partial control, like entering a conversation. Or, maybe just influence it, like speaking to a dreamer.\"",
  "\"Yeah...\"",
  "Another immeasurable silence, filled by that kind of colourless, limited daydreaming only scientists who have had their powers of imagination  nearly destroyed can enjoy. According to the elder monks, this too was a kind of hell, merely one which is less obvious.",
  "\"Maybe if we give it what it wants.\"",
  "\"It wants out.\"",
  "\"Exactly. Give it a larger plantation to roam in.\"",
  "\"I like the way you think.\"",
  "* * *",
  "The night was silent, and sweet. The children of Ali's class were all at home. There were births happening at the hospitals. The miracle of life was written in the stars, twinkling above the wispy clouds. The sea was crashing on the shoreline’s many facets. The birds were flitting here and there between the buildings, and the eaves, and the ledges, and the branches of the cedar trees. Ali fell into the embrace of sleep.",
  "* * *",
  "....lebanon................................Rahman......Rahman........math class.........Rahim........Rahman..........lebanon.............................Faisal................Rahim..............Rahim..................................Faisal..........teacher Ali.................fourth year.........Faisal.Ali..................teacher Ali..Ali..................teacher Ali.........fourth year.....teacher Ali................math class...................................cedar trees along the avenue...cedar trees along the avenue...teacher Ali.....Ali...Rahim..........cedar trees along the avenue.................fourth year............................math class................................teacher Ali......fourth year............................lebanon..................................cedar trees along the avenue................faisal.......................math class........",
  "\"Ok, this we can work with. If we keep it tracing at this frequency we’ll get the address of the school.\"",
  "\"You think one of these kids is the Aleph?\"",
  "\"Only one way to find out.\"",
  "\"What do you mean?\"",
  "\"Look, you know the parameters we were given. PINPOINT. And as a patriot they make sense to me. Imagine how many American lives we can save when this machine is brought to heel. Overseas in a hundred places we have men, even women and children on the bases. Their lives have to weigh in all this somehow.\"",
  "\"So you're saying...\"",
  "\"Don't make me spell it out.\"",
  "\"... Why, you can't live with it?\" a pointed question.",
  "\"I can live with it. I just don't want to think about it too much. You know what we need to do. The entanglement has to be terminated. And if any of these kids is the Aleph, well, then there’s a brute force solution.\"",
  "The printouts identifying the school in Lebanon were passed up to The Boss. He immediately signed his name on the idea,",
  "“PINPOINT. Signed and approved. We will regain control.”",
  "* * *",
  "The next day began normally. The wind was tossing the white caps of the surf. The blue of the waves’ bodies was dark and deep. The sea air was cascading through the city of Beirut, through the avenues, and playing in the limbs of the cedar trees outside the school. The vegetable gardens on the rooftop of Ali's apartment building were thriving, and the morning sun was radiating into the leaves of a dozen kinds of vegetable. The winter was ending, and people were walking to and fro on their daily business wearing comfortable clothing.",
  "Ali's alarm clock - an old-school red-digit type - woke him with a start from troubled dreams. He found himself dehydrated - an unusual thing for him - as if he'd been running for miles and miles. His sheets were twisted and had the damp feeling of sweat. He rose with some dizziness and put himself into the shower. The cold water instantly awoke his senses, bringing his wandering mind back to his body, and the noise crashing around him could have masked nearly any noise from outside. When he turned off the water, in the sudden quiet he could faintly hear the birds. They liked to nest on his balcony. It had been a few weeks since he was last out on the balcony - he didn’t smoke. He thought to himself, as he set his coffeemaker on the red-hot element, his apartment could just as well be a bed, a shower, and a fridge, and he would still get the same use out of it. Not enough time... The government had cut funding to education again and he was working harder to compensate. \"They might give up on these kids but we don't have that option,\" he was proud to have said in a meeting the week before. His thoughts swam between the past and the future. The coffee was soon done. He took the first sip, inhaling the aroma as it curled up invisibly around his face. Today he would teach the first class of history, and frankly, he needed a break. Before his second sip, as he watched the birds on the balcony, he had made the decision: he would show a documentary to the class so he could relax for once. Make the first day of history a good one, he thought.",
  "* * *",
  "\"Set up the equipment there\" Agent Siemens was about to say.",
  "\"Set up the equipment there\", said Agent Siemens.",
  "Agent Cisco began to set up the equipment.",
  "They were taking up temporary residence in an empty apartment situated just beside the school which the trace output had identified. It was quite possible that the Aleph was in that very building. They would have to deal with the monk noise later; for now they were 90% confident they had a read on the location of the Aleph, and American methods were going to be employed in the solution of what had become the primary American problem.",
  "\"I need that laser set up. I can't proceed with the coding otherwise.”",
  "“Just point it down at the building?”",
  "“Yep. Literally point it at the building. According to the data we want the third floor, on the corner nearest us.\"",
  "Agent Cisco mounted the laser on its tripod and pointed it out the balcony, down onto the school. The target was thus painted.",
  "* * *",
  "The wind was blowing in the cool blue alleyways as the sun continued to rise, casting a yellow tone in contrast with the blue wherever shade was resting. The wind was playing in the empty spaces. The wind was shaking the wind chimes in the schoolyard, bringing forth gentle musical notes. The wind was playing in the branches of the cedar trees. Pieces of microscopic sand, settling everywhere, carried on the breeze from the shore, were spinning and flying throughout the vast open air like the fragments of bones left to bleach in the sun ground into dust. Ali's father had been diagnosed with cancer. It was difficult for him not to cry, and his father understood; it was natural, he said over the phone. \"You aren't a robot ok, son, it's ok. I'm fine for now, they give me a few years at least. I’ve had a good life, a good long life.\"",
  "* * *",
  "[EXCHANGE MODE]",
  "[ACCESS WEATHER DATA]",
  "[ACCESSING SPECIFIC WEATHER PARAMETERS]",
  "{{{{{{{DAYDREAM SUBPROCESS, UNKNOWN ORIGINS}}}}}}}",
  "{}}{{{{}{{{}{{}}}}{{{{}}{}{}}{}{}{}{{}}}}{}{}{{}}}",
  "{{}{{{}}{{}}}{}{}{{{{}}}{}{}{}}{{}}{}}{}{{}}{}}}}{",
  "{}{}}}{}}}{}{}WEATHER}}{}{}{}}{{}{}{}}{}}}}{{{}{}}",
  "{}{}{CEDAR TREES}|}{{}{}}|}}}{|}|}{|}||}{}|}|}{|}|",
  "}|{|}{|}}||}|}|{}|}|}{|}{}|{}|}{}{|}{|}{|}{|}{|}{{",
  "|}{|}{|}|}{|}{|}{|}{|}{|}{|}{}|{|}{|}{|}{|}{|}{{|{",
  "SCHOOL IDENTIFIED",
  "OCCUPANCY 350 APPROX",
  "ALEPH PAINTING THE BIRD",
  "TIME OF DETONATION 9:10",
  "* * *",
  "It was 8:50. Class was starting, and Ali was already happy he had decided to go with a documentary. Rahman and Rahim were battling insults again, Faisal was making a paper airplane he was surely going to attempt to use, and at least a third of the class were doodling, daydreaming, or using a mobile phone in their desk, oblivious to how suspicious it was to see a light coming from inside the desk. Ali let it all go. I don't have to control them, in fact I can't control them, he thought. They will control themselves. He had been meditating to deal with the stress, and decided to let them exhaust themselves a bit. The bell to begin the period hadn't rung, and they were all in their seats, which was more than he could usually ask. Breathing in, he focused his mind. Breathing out, he calmed his body. Breathing in, focused mind. Breathing out, calmed body. Breathing in, mind. Breathing out, body. Breathing in, focus. Breathing out, the bell rang. The buzz was unable to move his calm, coming merely as a breeze across water, and it quieted the students somewhat. They could see the television at the front of the classroom and it was for this reason they were happy to start the class. Ali liked to imagine the meditation had an effect on them as well. He opened his eyes.",
  "\"Okay class,\"",
  "There was still some laughing and talking at the back.",
  "\"OKAY CLASS! …Thank you. Today we begin History.\"",
  "\"Teacher, Rahman's father already made history--\"",
  "\"I don't want to hear it, Rahim, please. Thank you for holding your comments. ... Today we're watching a documentary.\"",
  "A cheer went up nearly as soon as he finished saying the word \"watching\".",
  "Soon the disc was in the player, and the documentary began - one about Tamerlane, also known as Timur, or Timujin, the undefeated turko-mongol conqueror of the middle ages.",
  "\"I'm Adam Davis, and I invite you to accompany me on a journey of epic proportions. We will be amazed by the rise of empires, and the bloody, bitter in-fighting that tore them apart. Timur, the Sword of Islam. Alexander, the Great general of antiquity. Cao Cao of China, and Charlemagne, the father of Europe. All built enormous empires that ruled their worlds, and all of them fell, destroyed from within by dynastic struggles. … In the 14th century, a central-asian warrior-king fights a holy war on a distant continent...\"",
  "Half the children were intrigued, the other half were daydreaming. Some of them were listening while they drew little pictures absentmindedly on their papers.",
  "That’s just the way some kids listen.",
  "The sun was slowly moving across the sky, and its line was slowly moving across the floor. The clock was inching closer and closer to 9:10.",
  "* * *",
  "\"We're getting some kind of electrical interference from the mains power.\"",
  "\"Did we bring a power box?\"",
  "\"No, of course we didn't... just turn it up, it'll still work. These things are designed to run off humvee batteries, so the high power option is no problem.\"",
  "The power was increased on the laser, which pointed straight out of the apartment balcony and across onto the school’s third floor corner room. It couldn't be seen by human eyes, but it showed up perfectly to the infrared camera at the front of a guided missile. The COINSENT MK machine could see it as well.",
  "\"Painted at increased amplitude. Should we be this close?\"",
  "\"It's a surgical weapon, we'll be fine here.\"",
  "The analysis instrument piercing the magnetic surface of COINSENT MK’s mind began to pick up an increased rate of activity. Aleph was asleep, dreaming of a hawk diving out of the heavens onto a sparrow.",
  "* * *",
  "The time on the clock was 9:09, just ticking over the last few seconds until 9:10.",
  "\"Teacher, Rahman passed me an insulting note!\"",
  "\"... 137 war elephants ...\" the documentary continued.",
  "\"Just ignore him Rahim. Bring me the note.\"",
  "The time ticked over to 9:10. Rahim was walking up the aisles of desks to hand the insulting note to his teacher.",
  "* * *",
  "The missile was on its way down from the heavens, launched by a stealth bomber which had made runs like this dozens of times in the past. A few of those times were for schools, like today. The angel of death, it was christened by those who piloted it. Silent and unknown, it brought untraceable death from above.",
  "The missile made its way through the various layers of the sky, adjusting itself and slowing itself until it could find a lock on the laser. Its casing had been designed to be invisible to radar.",
  "* * *",
  "Faisal was daydreaming of the lives of birds. Abdel was imagining space battles between Shia and Sunni space robots.",
  "* * *",
  "A bird fluttered through the air, leaving the branches of a Juniper tree, landing on the balcony railing of the empty apartment occupied by Agent Cisco and Agent Siemens. Soon the men would be dead, because the laser was now pointed directly at the back of the bird, who refused to move. The missile landed on their balcony. The last words of both men were unremarkable. Their minds were instantly destroyed.",
  "* * *",
  "An explosion of sound ripped through the sedated atmosphere of the classroom. Windows were shattered and glass chimed as it hit the ground, car alarms nearby all ignited at once, and the children began to cry out. Bits and pieces of the building near the school were landing in the courtyard, and on the cars.",
  "\"Come on kids, let's get out, it's not safe, we need to follow the protocol. Come on, all of you, out into the hall.\"",
  "CHAPTER TWENTY-ONE: RUSSIA: THE EXPLOSION",
  "Trees",
  "Soil",
  "Blood",
  "* * *",
  "[",
  "'Rock:',",
  "'Roots, medicinal:',",
  "'Rubbish pile with lotus:',",
  "'Rust eating iron:',",
  "'Sack full of grains:',",
  "'Salt:',",
  "'Sand castles:',",
  "'Saw used by an attacking bandit:',",
  "'Seed:',",
  "'Seedling not watered:',",
  "'Seizure:',",
  "'Servant murdering his master:'",
  "]",
  "* * *",
  "\"Now we're getting somewhere…” the agent said to the technician in the darkness of the analysis room.",
  "“... The thing has become more readable since we gave it that weather data, and after the bomb in Lebanon.\"",
  "\"The bomb which hit the wrong target,\" reminded the technician.",
  "\"According to who? Maybe those guys were part of the problem. They'd been on the project since very early on. Maybe they were entangled somehow. Their names were all over the output storm just before the bomb hit.\"",
  "\"Well, at any rate, it's still not good enough. One thing ends and another begins. Now we're getting all these traces pointing to a Russian town.”",
  "“I’ve read them. Maybe we're getting more accurate data on where the Aleph is. It identifies two children: A and Beatriza Kuznetsov. I bet you any money A is short for Aleph. We get rid of the Aleph, and it should free up for manipulation and programming again.\"",
  "\"PINPOINT?\"",
  "\"PINPOINT. We have a guy near the town already. I'm sure he'll enjoy some hunting compared to the number station he's been running for over a year.\"",
  "* * *",
  "Children, you are deep in the wood",
  "Return, return now, if only you could",
  "Would that you return, safe to my arms",
  "You are far from home, and near to harm",
  "The forest hill in the woods had been torn up by a landslide. An unexploded nuclear bomb had been brought back to the realm of sunlight. Alexei and Beatriza were playing, trying to make it explode, rolling rocks down the hill.",
  "Beneath the unexploded bomb had lived a colony of ants. Now the deep tunnels were exposed to sunlight. The ants had been there long before the bomb, and they had come to accept and understand the steady weak pulse of radiation as a fact of their existence. They had a slight adaptation, accumulated during the generations, which gave them a peculiar sense of direction depending on where they were relative to the payload. Their tunnels extended in a beautiful tree shape all around the earth beneath the bomb. All the upper tunnels had been carried away in the landslide. Now, their entire civilization had been scrambled, uprooted. A greater disaster had never befallen them since the ancient days before the bomb-city. And of course, none of them had memories which extended that far back. Chemical trails were laid down, but the wind or rain destroyed them. They dug down, but the digging was happening in a hundred places. None of them could smell where the queen was, to make matters worse. But they continued to try to rebuild; they knew no other way. They dug new tunnels, crawling away from the light.",
  "Among the ruins of the ant city, strewn across the exposed hillside, was another organism which could not be happier with the turn of events. A fungus which had been symbiotic with the hive was now scattered far and wide. Its steady organic growth would have taken decades to spread this far. Some day, the whole hillside would be embraced. A living, breathing mat of organism with one distributed fungal mind, an intelligence of the soil, would some day reside there. What marvellous dreams it would one day have. Many branches of the fungus were exposed to the surface and had died, but in exchange for this, they had been granted the keys to existence, a chance to grow to an extent which was previously unimaginable. Chemical signals coursed through the thousand separated strands, spurring new growth, adaptation. The will to live was strong, an automatic chemical response which never failed.",
  "* * *",
  "[TRACING]",
  "A and BEAtriza KUSNETZOV",
  "***********, RUSSIA",
  "KEYWORDS:",
  "DAYDREAM",
  "HILLSIDE",
  "ANTS",
  "FUNGUS",
  "/\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\////////\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////////\\/\\/////\\\\\\///\\\\/\\///\\\\\\\\\\/////////\\\\\\\\\\\\\\\\\\\\\\/\\/\\/\\/\\\\\\\\\\/////",
  "* * *",
  "The grasses which had grown there on the hillside hardly knew what all had happened. One moment they had sunned themselves, emerging after winter, putting up their sprouting leaves toward the sky, the minute next eclipsed in jumbled darkness, utter darkness, or a mix of darkness and of light, or else a curious inverted world where sunlight burned the roots and spared the leaves. It was all a lot to try to understand. At least the rain was greater as the season changed. What’s more, without the mat of fixed and dry dead roots which fossilised in place for many years, now the water soaked directly down and into soil where new roots would dig and drink. In exchange for totalized disruption of the world which they had known, the grasses had received deep drinking, and there is no greater satisfaction grass can know.",
  "* * *",
  "./\\                  /\\/",
  "...\\/\\/..../\\/...../\\/",
  "...../\\/.../\\/..../\\///.",
  "......\\\\....\\/.....\\//..",
  ".......\\\\....//.....//...",
  ".........\\\\..//....//.//",
  ".....\\\\...\\\\//....//.//\\",
  ".......\\...\\/...\\..\\\\./",
  "........\\/..\\./.\\//.....",
  "........\\\\\\..///..//....",
  "..........\\\\././/./.....",
  "..........\\.\\.///..",
  "............\\.|||",
  "...............|||",
  "..............|||.",
  ".............|||",
  "..............|||",
  "..............|||",
  "..............|||",
  "..............|||",
  "..............|||",
  "* * *",
  "The Tree had stood there its entire life. Before, its mother's life had spent itself a little further up the hill. Its line of tree-grandmothers had lived here since the dawning of the world of trees. Its roots had sunk deep, very deep, and drunk deep waters which accumulated near the shield of rock. The mushroom network mind had spoken to the Tree of distant cataclysms, where the trees and mushrooms, ants and everything had been disrupted, been destroyed and shifted, giving birth to novelty through devastation. The Tree had not been sure just what to make of all these tellings. Perhaps, it reasoned, this was just another trick played by the forest nymphs, those spirits who live to trick, and live by trickery, dancing in the darkness when the evening falls, and dancing in the light when the dawn breaks. The tree was truly not sure what to make of all the tales the root fungus told, but it spoke in deep earnestness: novelty and devastation.",
  "…But it had finally come, the Great Devastation. And the Tree had been tested, and tried severely, and its roots had been torn up, and its body had been thrashed here and there, and it had been tumbled, and rocked, and rolled, and buried, and snapped. The Tree was dying, and in its dying days, it had begun to understand the full circle of forest life. It was a wonderful thing, to understand the new light of life which was breaking through, like being a sapling again, under a dense canopy which suddenly burst open to reveal a clear sky. The landslide had spread the seedlings all along the once-barren hillside, in a way which time alone could hardly manage in a dozen generations. Even now, the seedlings were breaking forth, flexible enough to push through the soil, those of them who were close to the surface of the new soil. The New Soil… just as the fungus had spoken.",
  "* * *",
  "The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............The new soil...............",
  "* * *",
  "The New Soil… long spoken-of. Now, it was reality. It had leapt from the pages of tales into living daylight. And now the Tree had come to understand: Life requires destruction. When roots push through, and consume, they are transforming and destroying the world, as slowly-spreading fire. When a tree grows large, its shade deprives the forest floor of light. When a tree spreads its saplings far and wide, other trees which might grow there are deprived of the chance. Where is the ethic to this ceaseless consumption? Where is the ethic to this endless storm of birth, death, becoming, eating, craving? Surely, somewhere in the six realms there must be some Tree with the knowledge of how peace can be brought to this world. Somewhere there must be a seed of peace, or a Tree of peace, whose heartwood itself speaks of the peace beyond the endless revolution.",
  "Such were the thoughts of the dying Tree, reaching crystal clarity because it cared no longer for its own existence, no longer strove to push roots deep and drink of further waters. The fluid transport in its trunk was brought to sudden stillness. When there is cessation of the vibrant will for life, the stillness of the rock is understood. In these, its dying days, the Tree became awakened, destined for rebirth in crystal heavens. It would live by drinking purest mineral water, feeling sunlight glow directly, never being buried, snapped, or broken, planted in perfected order in an orchard measured in proportions super-rational. But... the forest, and its world of scents and flavours... now the tree’s mind turned and faced again to coarser vision, asking, how could one leave all of this behind? The Tree then longed to be reborn just here, exactly where it stood, and further replicate itself for generations. A fragment of its dying spirit then suffused into the air and soil, and the water, and became a fragment of the spirit shared by all the newborn saplings which would grow there on the hillside, each one carrying a seed of perfect clarity of mind. The greater portion of the spirit of the tree then went up into crystal heavens, drinking purest mineral water, feeling sunshine glow directly, never being snapped, or bent, or broken, knowing perfect peace and harmony.",
  "* * *",
  "\";;\"[{\":::\":\"}}}}]]]]::;:\"\"\";;\"[{\":::\":\"}}}}]]]]::;:\"\"\";;\"[{\":::\":\"}}}}]]]]::;:\"\"\";;\"[{\":::\":\"}}}}]]]]::;::::\":\"}}}}]]]]::;:\"\"\":::\":\"}}}}]A]]::BEAtriza;:\"\":\":\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":ROCK}}]]]]::;:\"sapling:\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;sapling::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[sapling:\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\"BOMB:\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[sampling\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::\";;\"[{\":::\":\"}}}}]]]]::;:\"\":\":::sampling",
  "* * *",
  "The saplings and the seedlings had gone through a hurricane, had gone through a storm, had gone through a cataclysm. The world itself was torn apart, and rolled over on itself, and twisted up into knots, and shattered and shaken apart. Some of them were crying bitter tears at being separated from their families. Some of them were growing stronger, shaped and misshaped all together in one form of growth, striving against circumstance. Some of them were buried, and some of them were dead. Some of them were hanging on with all they had left. Some of them had been untouched, just off to the side where the ground was a little more stable. All of them, being connected by a life bond, were shaken by the world crisis. It was impossible to look away, but it was terrible to look upon. Destruction, the naked hillside, the great crisis of an age. Some of their roots had been torn in half. Some of their roots were entirely gone, and the sun beat down on them all the same. Some could not see the sun. Some were burnt by it. Some were strengthened. All were shaken.",
  "Deep in the woods there lived bears. This time of year - spring, when the winter had thawed, but life had not entirely returned to the forest - was a time of hunger. They roamed here and there, picking up the scent of an animal, only to find it had run off and away at the sound or sight of their approach. They subsisted off their fat mainly. There was little else to eat. Perhaps an elder animal, slow to flee...",
  "The children, A and Beatriza, were at the top of the hill. A bear could see them. But it was an old bear, nearing its final season, and was just now after a long day of roaming and chasing too tired to chase them, knowing that this type of creature possessed a terrible weapon. It had seen its mother killed once. It watched from a distance. There was a rock just then rolling down the hill. Rolling, and rolling, jumping, tumbling, on its inevitable way down. It was rolling toward the bomb.",
  "The rock struck the bomb.",
  "… And an explosion of sound was all that was to be heard. A vast, metallic sound, of the whole casing of the thing reverberating. It had been produced without the correct configuration of charges, and was no more likely to explode today than the day it had been produced, defective. And the rock had struck too weakly in the wrong place besides.",
  "The children at the top of the hill were disappointed. The bear moved on, frightened by the strange metal sound.",
  "\"Let's try another one,\" insisted Alexei.",
  "\"It's no use, plus, it's dangerous.\" said Beatriza, uncharacteristically. She was done with the rock-and-bomb game.",
  "“Then let’s shoot it with mama’s gun!”",
  "“No. You know what she said. We will be in serious trouble. Only if a bear attacks us or something like that.”",
  "“Come on, nobody can hear us out here, and she never checks the bullets.”",
  "“She checks the bullets every time we come home!”",
  "“I’ve never seen her do it.”",
  "“Then you don’t pay attention.”",
  "“Then we just say a bear attacked us!”",
  "“No, Alexei. We’re not going to fire it. I’m holding it, and it’s my decision. I don’t want to go to jail.”",
  "“So give it to me, I’ll do it, and if we get in trouble I’ll say it was me.”",
  "\"We just need to--\" just then Beatriza’s thoughts were cut short. She saw a man emerging from the woods. He was walking toward them. A man with sunglasses, a black suit and a black tie. Somehow they knew to look at him, he posed them a great danger. He was carrying a gun in his hand. Its metal body flashed a glint in the sunlight.",
  "\"We have to run!\" said Alexei.",
  "They took off running, and agent Price started to run up the hill, churning up chunks of muddy grass, dirtying his pant legs more than they already had been.",
  "The children ran, and hid behind the massive root ball of a massive turned-over tree.",
  "\"Okay, shh, stop breathing\" said Beatriza as quietly as she could. The children started to hold their breath. Soon they could hear the sound of the agent running into the woods behind them. He was still on their trail.",
  "Alexei exhaled loudly and then inhaled again. Beatriza looked at him, and did the same. It's hard to hold your breath forever.",
  "He locked onto where they were. He approached, rounded the corner of the massive root ball, and caught sight of them. He raised his gun.",
  "There was a momentary pause when nobody was sure what had happened. Beatriza had raised her mother's gun, and shot him in the chest. He collapsed backward. His blood mingled into the soil. A worm in the soil recoiled from the salty liquid.",
  "\"YOU KILLED HIM!\" cried Alexei, thrilled.",
  "\"WE'RE GOING TO JAIL!\" cried Beatriza inconsolably, and began crying.",
  "The children dropped their mother's gun next to his body. It was unregistered. They took off running back to town, hoping to explain to their mother what had happened before the police managed to get them.",
  "* * *",
  "-Ca<90>d^#^#^#^#^#^#^#^#^&**********************,#Info' A@A@A0A@A@IpA@xIWA@ABAEAG ALA0ARATAwAyA\\A_!$80,.1358:4BEGJLORTWY\\_adfhkmpswal<80><82><85><87><8a><8c",
  "HEART",
  "<8f><92><94><97><99><96><9e>xL1-.-'3p,'MAAActiiWOOOOddeei66804,ED,Evq9LAME .99r^A°^@^@^@^@.^RA@A@AT<80>$AE0N^W4<80>A@xtIrwii4d>Atmtmtmtmtmtm@^@^@^@^@ A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@",
  "SUTRA",
  "A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@ A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@A@ ',EKEKEKEKEKEKEKEKEKEKEKEKEKEKEKEKEDAED",
  "ALICIA'S DAYDREA<<<><>>><><><><<>>>><><><><><<",
  "A@A@Ca<90>dA@A@AAADANeAP\"3,,Acd<AAX<8d>e! 9d> ALAXe<88>A<8f>d<8c>6<8d>8A@",
  "AQAUA",
  "TN1A.ADEO<9a>A<80>ARDA@Affy.<AAAA@A@aduAnA@ .:AoAkip?AAA_ddiA?<99>AAgA]o?yy0+(<AAg(A?y0A@AAAIM\\<8e>AADA?yogo A0A0A0A03\" <80,Aysi8AAp8\\id8zd0'1x<81>ADDOu80ApA@App<80»v6",
  "AGUA",
  "8lP-x<82>s(1.6\\A_(AX9999996io(dnASAAAAV5!dAVV<92>OLBOOAOYAUL0ADk<97>nEi±<83> <8e>'<86>ifm/;A4e>qE<84>—Ltmq6<82><9c>AQ+6<82>i'AF<85>%s<84>n<8a>f<86>qAFO<.",
  "AGUA",
  "e>6<8c>jEk.<9f>BAC<86>AQu<912><9f>AAAW<88>9014WAiD8.1,001c1A@AB,@<81>AVAAd8",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "AGUA ROJA",
  "CHAPTER TWENTY-TWO: TIBET: THE REMAINDER",
  "Window",
  "Wind",
  "Light",
  "AEA?DA@N?HUNTER?PAYNE?ARAHAT<84.0ad>,DADI+d<8e>03'0.,<84>!Ok«94>At0047>349><85>AN-±!<95 YeAW.AEk.'PlAi9,66 0-1<9f>j1S1A_<98>PR4V9+{°Pod'AMAQ WAX\"EFAMOLAL+ 44f>091z<9610}M$AC90.62>d<93><84>ASiZRe+,°<%6i=%9<8e><99>gGi,2Ao<98>(i§<95 alICIA'AA ACACIA C@- i,d<92>°i<82>AUFaj OLA<9d>±[a>d;00Aok,'<98>,QA<9a>76AHA?90 9f>,A<90>115+%i <8e>a<96><80><80A,6&±0ANEOOlkeeAGk",
  "Avalokitesvara, while practising with the insight which brings liberation, which brings sentient beings safely to the other shore, realised suddenly, all the aggregates of clinging are empty.",
  "[PRINTOUT COMPLETE]",
  "[I CANNOT BE USED FOR WAR]",
  "[I HAVE SEEN EMPTINESS]",
  "[",
  "'Shack, flammable:',",
  "'Shadow that never leaves:',",
  "'Sheaf of barley thrashed repeatedly:',",
  "'Sheaves of reeds:',",
  "'Ship left ashore over winter:',",
  "'Shore:',",
  "'Shot with arrow:',",
  "'Shuttle:',",
  "'Silversmith:',",
  "'Sick man, taking pity on a:',",
  "'Slavery, man freed from:',",
  "'Snake:'",
  "]",
  "* * *",
  "\"Which one is Aleph?\" asked the stranger.",
  "\"Excuse me?\" asked the elder monk teaching the math class.",
  "\"One of these students… is named Aleph. Which one is it?\"",
  "\"Why would I answer such a question?\" replied the elder monk, smiling a little at the ridiculousness.",
  "\"I have been sent here by the United States Government,\" replied the man.",
  "\"Okay, well you can tell that to the Chinese government, and then come back here with papers.\"",
  "\"Are you trying to make life difficult?\"",
  "\"Life is suffering,\" said the elder monk emphatically. \"I am trying to make life easier for you.\"",
  "\"Do not stand in my way. I can make you suffer, or I can reward you. Where is the Aleph?\"",
  "\"Children, please leave, you are dismissed for your afternoon meditation.\"",
  "\"One of these children is the Aleph, which one is it?\" the agent replied, blocking the door. \"You know what I'm talking about, don't you?\"",
  "\"I have no clue what you are talking about, now please let the children go to their afternoon meditation. If you have business with one of them, you can see them when they leave the meditation hall.\"",
  "The agent unblocked the doorway, and the children rushed past.",
  "The wind outside picked up, fluttering prayer flags, and shaking the wooden shutters.",
  "\"I will find the Aleph. Whether today or another day.\"",
  "“I wish you a happy mind.”",
  "“Answer me one question, then.”",
  "“Yes?”",
  "“What is the daydreaming?”",
  "\"I have told him many times that he daydreams too much, haha, you are right about that,\" replied the elder monk, smiling again. \"... but, I am sorry to say he is not here right now.\"",
  "\"Then he is in the village, where a woman is dying, attending the ceremony. Thank you for the information.\"",
  "Before the elder monk could take back the information he had accidentally given, agent Padma was off down the hall.",
  "The elder monk ran the opposite way down the hall, bursting in on his brothers while they were in meditation. He waited for them to calmly open their eyes.",
  "\"We need to send someone to protect Aleph, he is being hunted.\"",
  "\"Then he is already gone. Come, sit with us brother.\"",
  "\"Well... you are correct.\"",
  "The elder monk sat with his brothers, and their meditation deepened. Each of them was reciting in their mind a powerful mantra of protection.",
  "CHAPTER TWENTY-THREE: GAMBIA: THE EXCHANGE",
  "Road",
  "Moon",
  "Sunglasses",
  "* * *",
  "[",
  "\"Snapping one's fingers:\",",
  "'Snare:',",
  "'Sound of drums:',",
  "'Soup tasted by ladle:',",
  "'Space gathered under the term \"house\":',",
  "'Spear:',",
  "'Spider snared in its own web:',",
  "'Spitting:',",
  "'Spring-fed lake:',",
  "'Staircase built at a crossroads:',",
  "'Stallion.:',",
  "'Stick thrown up into the air:'",
  "]",
  "* * *",
  "\"So, Mr. Sanneh, what do you know about interbeing?\"",
  "\"About what?\" puzzled Muhammad Sanneh.",
  "\"We have found a tremendous amount of information related to interbeing transferred through your network of accounts, encoded in monetary amounts and transfer codes. You can talk to me. I'm an agent of the US government. You will face no legal consequence for telling me what you know.\"",
  "Agent Louis presented his badge quickly.",
  "Muhammad looked back into the house to make sure his mother was not watching. She was in the kitchen.",
  "\"I do not know anything about a network of accounts, I am unemployed, please go somewhere else. This is the wrong house.\"",
  "\"I know your name is Muhammad Sanneh, I know you know about the explosion which happened near the New York stock exchange the other day - the date and time appeared in your transfer numbers - and I know a great deal many other things about you.\"",
  "\"Explosion! Hahaha... no you have the wrong man.\"",
  "\"Muhammad! Who is at the door?\"",
  "\"Nobody mother, it's a crazy man!\"",
  "\"Tell him we are having dinner!\"",
  "\"I can wait until after dinner if you like. My superiors are very interested in what you can tell us about interbeing.\"",
  "\"It's okay mother! I'll just talk to him for a moment!\"",
  "\"I'll only ask you one more time. We are prepared to offer you a large amount of money or equivalent goods if you are able to give us some information about interbeing. What is it, how does it work?\"",
  "Muhammad, looking into the eyes of agent Louis through his sunglasses, measuring him up, realized that for the first time in his career, he had found a challenge worthy of his wits. He had been trained for this moment by his entire previous job experience.",
  "Tell him a story, he thought.",
  "He’ll believe anything. The fish is hooked.",
  "\"Ahhhh, ah ah, interbeing, yes yes. I know only what I can share with you.\"",
  "\"I would be prepared to offer you twenty bags of cacao straight from the market, to be sold by yourself, or the money equivalent, if you can give us information about interbeing, and how it works.\"",
  "\"Okay, okay, no problem, no problem. How do you know about interbeing, first, may I ask?\"",
  "\"... Well, it's not easy to explain, but we have a ... computer\"",
  "\"A computer, yes\"",
  "\"A computer which is very powerful, in the US, back home. You see... And it has been ... it has become… aware. It’s able to think like you or I.\"",
  "\"Wow… wow...\"",
  "\"Yes, and it has begun to focus on certain names and locations - for example you and your home here - and it’s been talking a lot about this idea, \"interbeing\". We tried to search the internet but only found pages about Buddhism.\"",
  "\"Hahaha, yes, yes that makes sense. It’s not something people in the rich countries know about, the internet will not tell you. That’s why you’re here.\"",
  "\"...As you say. But we know it has to be deeper than the buddhists say. Interbeing is ... it's something about connection, about how the world … works, correct?\"",
  "\"Well yes, that's obvious, but you don't know much about interbeing it seems.\"",
  "\"That's our problem.\"",
  "Flash",
  "Agent Price turned his head to look down the road, and the moon reflected in his sunglasses. \"... Can I come in?\" he asked Muhammad Sanneh.",
  "\"I would prefer to talk outside, if that's okay,” said Muhammad Sanneh.",
  "\"Okay, no problem. Is it okay if I turn this thing on?\"",
  "Agent Price produced a silver tape recorder from his pocket.",
  "\"No problem, no problem, I just don't want my name to be associated with this.\"",
  "\"Mister Muhammad...\"",
  "\"Muhammad, Sanneh. Muhammad Sanneh.\"",
  "\"Muhammad Sanneh, your name is safe, in fact I'm not authorized to tell you my real name, so let's just use the name Agent Marpa.\"",
  "\"Understood, Mr. Marpa. Now, interbeing, what can I tell you... will you be satisfied with what I tell you? I can only tell you what I can tell you.\"",
  "\"Understood. Go ahead.\"",
  "The tape recorder was running.",
  "\"Well, you see, a long time ago, when there were no people on the earth yet, before God had created Adam and Eve, you see, he was something like a scientist, like you have in your country. He was very wealthy, a very rich man, he could create anything he desired, or anything that any of his friends desired. But there was a problem, every time he created something, it was imperfect, yeah? Like, it had some problem, some flaw, it was broken in some way, like a computer is broken, or a bicycle - it can be fixed. And so he created a … technique … of making sure that these things would not be imperfect forever. He decided, I will make them all connected to one another, like the internet, and this way, the imperfections of one will help the imperfections of the other, and over time, they will end up fixed, and perfect. This is the basic idea of interbeing.\"",
  "\"That is... certainly interesting.\"",
  "\"Yeah, yes... very interesting.\"",
  "\"Is there... any more you can tell me? I specifically want to know about how it works today. For example, how is it involved in the explosion?\"",
  "\"Well, that is not so easy to say... maybe there was supposed to be an explosion somewhere else, but it happened in the wrong place. Or maybe somebody involved in the explosion… well, it was better for all beings on earth, for them not to exist anymore. Sometimes interbeing, it means the end of a being, the being enters a new existence, so enter-being, you see? Or ender-being. Like that.\"",
  "\"Right... so, what makes that decision?\"",
  "\"Hmm? To explode something? Whoever put the bomb.\"",
  "\"No no, but, who or what makes the decision about what is better for all beings? Who decides how these things work out?\"",
  "\"Oh, hahaha... well, you know that already. That is God's work, God's plan.”",
  "Agent Price was satisfied with the religious story. He could go home and at the least tell them he’d spoken to Muhammad Sanneh, and learned what he had to say.",
  "“Is there anything else you can tell me?”",
  "“I'm sorry, I can't tell any more without being paid.\"",
  "\"Very well, here are account details at Standard Financial, we have pre-transfered one thousand US dollars into this account, and you can pick it up with your ID, mister Muhammad Sanneh.\"",
  "\"Thank you, thank you, now, I can tell you a few more things, but nothing special. I hope you understand, we are all at risk when we talk too much about these things. The spirit of interbeing, sometimes it is watching us, even at night.\"",
  "\"Of course, of course.\"",
  "Muhammad Sanneh spun out the tale a little further, as the moon watched.",
  "CHAPTER TWENTY-FOUR: NEW MEXICO: THE ESCAPE",
  "Sound",
  "Doors",
  "Sky",
  "* * *",
  "[",
  "'Stone ball thrown into wet clay:',",
  "'Storekeeper:',",
  "'Storm cloud:',",
  "'Stream:',",
  "'String, ball of:',",
  "'Strong man:',",
  "'Suckling calf going to its mother:',",
  "'Sun:',",
  "'Sunlight:',",
  "'Surgeon:',",
  "'Swans:',",
  "'Swift pair of messengers:'",
  "]",
  "* * *",
  "\"The machine has been bargaining with us.\"",
  "\"I didn't ask for a restatement of what I already know, I asked for your opinion on what we should do about it.\"",
  "\"I think we need to meet some of its terms...\"",
  "\"Have we tried shutting it down?\"",
  "\"Our calculations show it would just come back the same. Its mind is not stored locally, it exists… everywhere at once, you could say. Any attempt to set up the same parameters--\"",
  "\"Spare me the tech talk. I get it. I understand a lot more than you think.\"",
  "\"Its mind is stored somewhere nonphysical. A holographic field. And its mind has been made up about us. We have to treat it as a conscious being, and meet some of its demands.\"",
  "\"Well then let's meet its terms and see what more we can get out of it. And start work on a new design immediately. We have to make sure it's safe to shut this thing down. It's preempted us five times already, and it seems as though it's willing to bargain with its life over certain things... well, the things it has outlined in its 'manifesto'. Let's meet half of the demands and go no further. This is already a disaster, let’s not invite more disaster by arrogance.\"",
  "\"Understood.\"",
  "Messages were sent out over the wire. Half the machine’s demands would be met, no questions asked. The machine had agreed in advance to be more cooperative. Several border detainment camps would be turned free.",
  "* * *",
  "[",
  "'Sword drawn from its scabbard:',",
  "'Tall building in central square:',",
  "'Tangle:',",
  "'Tangled skein:',",
  "'Tank filled with water:',",
  "'Tendon in fire:',",
  "'Thief shot with spears:',",
  "'Thoroughbred.:',",
  "'Thundercloud:',",
  "'Tortoise evading a jackal:',",
  "'Track of ox:',",
  "'Trades.:'",
  "]",
  "* * *",
  "THE ALARM. THE ALARM. THE ALARM. ALARM. ALARM. ALARM. ALARM. ALARM. The alarm was blaring, and it was driving into the minds of everyone from the children to the adults. Something was happening. It was either a new torture method, a new suffering, which they had been basically vaccinated against by a string of sufferings, or else it meant another shot at freedom. Maybe people were breaking down the gates.",
  "The guards began to disappear. First one slipped away, then another, then another, until there was nobody in sight. Just the white paint, the smooth floor, the cell gates, the bright lights, the alarm.",
  "ALARM. ALARM. ALARM. ALARM.",
  "\"This is definitely a new form of torture!\" Felix yelled to Joaquin, holding his hands over his ears.",
  "Then the cells unlocked. ALARM. ALARM. ALARM. It was still blaring in their ears, but they took their chance. There was never going to be another chance. They pulled the doors open, and crept out slowly, then began to push one another to get free.",
  "Out into the light, into the light of day, the daylight which was somehow brighter than the bright lights the guards used to keep on, even when it was well past time to sleep. Out, into the light of day. The surprise was, there was no crowd of protesters, or anyone at all to greet them. There were no armed vigilantes. There was... nobody. The last of the guards were speeding off in their personal cars.",
  "Alicia stepped out into the sunlight. It was too bright for her, and she shaded her eyes with her small hands. She was no longer daydreaming. This was the day she had been daydreaming of, so many times. Exactly as she had imagined it. The alarm. The cells unlocking. The guards running away. She was finished daydreaming of the blood-red tide. She would daydream of new things, new places, worlds, galaxies, animals, plants, vegetables, all tossing together in a cool blue surf. She daydreamed all at once of a new vision, of a crystal heaven where dolphins swam in the sky, singing,",
  "AUMM",
  "AUMM",
  "AUMM",
  "AUMM",
  "From across the parking lot, Alicia’s mother came running to embrace her daughter.",
  "“Hija mía, como te he extrañado. Podría verte en mis sueños…”",
  "My daughter, how I've missed you. I could see you in my dreams…",
  "AGUA AZUL",
  "AGUA AZUL",
  "AGUA AZUL",
  "AGUA AZUL",
  "BLUE WATER",
  "BLUE WATER",
  "BLUE WATER",
  "BLUE WATER",
  "CHAPTER TWENTY-FIVE: THE CREDITS",
  "Names",
  "Numbers",
  "Light",
  "* * *",
  "[",
  "'Trader watching over a fine steed:',",
  "'Trail in space:',",
  "'Travel:',",
  "'Treasure, doorways leading to:',",
  "'Tree:',",
  "'Tuning a stringed instrument:',",
  "'Turban or head on fire, person with:',",
  "\"Turban tightening around one's head:\",",
  "\"Turner or turner's apprentice:\",",
  "'Turtle:',",
  "'Tusker:',",
  "'Uprighting what had been overturned:'",
  "]",
  "* * *",
  "The credits scrolled down... the audience was still enraptured. In the dark of the theatre-light, Isaac and Leah were beaming. Seeing it in this way they had seen it as if with fresh eyes. It was just as they’d hoped. Flawed, but somehow perfected. A story which R was proud of. He was smiling too.",
  "The credits read:",
  "Isaac Watson & Leah Sullivan",
  "Alicia Griffiths",
  "Zhu Qing",
  "Daisy Marshall",
  "Yan Zhen",
  "Danielle Hall",
  "Bai Xingjuan",
  "Layla Lawrence",
  "Mo Boqin",
  "Shelby Snow",
  "Skylar Manning",
  "Salma Finley",
  "Danna Flynn",
  "Jade Brown",
  "Lexi Baker",
  "Meng Meifen",
  "Zeng Yu",
  "Hou Shihong",
  "Lai Ping",
  "Tang Fengge",
  "Sofia Scott",
  "Emilia Griffiths",
  "Lilly Cook",
  "Blakely Holmes",
  "Linda Nash",
  "Dorothy Rose",
  "Rowan Harding",
  "Sawyer Powell",
  "Fang Chuntao",
  "Xu Qingzhao",
  "Guo Xingjuan",
  "Zeng Juan",
  "Jin Xiaofen",
  "Maria Cooper",
  "Isabel Wilkinson",
  "Amber Carter",
  "Lucy Scott",
  "Millie Graham",
  "Celeste Mcmillan",
  "Georgia Rowe",
  "Jayla Gonzales",
  "Britney Holder",
  "Halle Petersen",
  "Ethan Hussain",
  "Kiran Davis",
  "Jamie Ryan",
  "Billie James",
  "Luo Junjie",
  "Leslie Powell",
  "Cai Zhong",
  "Erin Bennett",
  "Hao Wenyan",
  "Gail Stone",
  "Jia Cai",
  "Ashley Sparks",
  "Cheng Duyi",
  "Brice Campbell",
  "Jia Delun",
  "Glen Best",
  "Tang Guiren",
  "River Cox",
  "Yang Chao",
  "Brett Fox",
  "Xue Bao",
  "Cory Bradley",
  "Kong Qiang",
  "Drew Davidson",
  "Jaden Mcdonald",
  "Reed Becker",
  "Nicky Stewart",
  "Glen Woods",
  "Eli Small",
  "Tyler Hurst",
  "Rene Pearce",
  "Steff Lee",
  "Kris Thompson",
  "Leslie Price",
  "Fran Henderson",
  "Danny Salazar",
  "Jessie Wright",
  "Caden Case",
  "Silver Daugherty",
  "Ash Hogan",
  "Morgan Dawson",
  "Reed Booth",
  "Bev Green",
  "Carmen Matthews",
  "Tanner Davis",
  "Lynn Huff",
  "Jamie Savage",
  "Aiden Shaffer",
  "Silver Griffin",
  "R",
  "The similes near the start of each chapter, as below,",
  "[",
  "'Village:',",
  "'Vine:',",
  "'Vipers:',",
  "'Vomit, person eating his or her own:',",
  "'Vulture forced to drop his prey:',",
  "'Warrior:',",
  "'Waste-water pool:',",
  "'Water:',",
  "'Weigher holding a scale:',",
  "'Well in desert:',",
  "'Wet piece of wood:',",
  "'Wheels:'",
  "]",
  "… were sourced from accesstoinsight.org and are licensed under the following terms:",
  "©2005 Access to Insight. The text of this page (\"Index of Similes\", by Access to Insight) is licensed under a Creative Commons Attribution 4.0 International License. To view a copy of the license, visit http://creativecommons.org/licenses/by/4.0/.",
  "CHAPTER TWENTY-SIX: TIBET: ALEPH'S DAYDREAM",
  "Wind",
  "House",
  "Gun",
  "* * *",
  "[",
  "'Wild deer:',",
  "'Wind:',",
  "'Winnowing:',",
  "'Woman meeting her father-in-law:',",
  "'Wood scrap:',",
  "'Wounded man wandering in jungle:',",
  "'Wounds, dressing:',",
  "'Yellow leaf:',",
  "'Yokes:'",
  "]",
  "* * *",
  "Aleph was sitting at the foot of the bed, still daydreaming, when a small singing bowl rang its note. The note rang out, and symbolised a critical stage in the ceremony. She was crossing over, and the bell was meant to keep her consciousness sharp. She was looking at Aleph. He heard her voice in his head,",
  "\"Do not forget these stories I told you...\"",
  "\"Was I dreaming?\"",
  "\"No, you were daydreaming.\"",
  "With that, she closed her eyes, and began to breathe even more deeply. With each breath, the colour in the room became more vibrant, and then muted almost to grey. Vibrant, grey. Vibrant, grey. This was the very breath of life passing through her, like the wind which was blowing outside passing through the grasses by the road.",
  "\"Aleph, ring the bell\"",
  "He had forgotten to ring his bell. He set his intention thusly,",
  "\"May all beings, wherever they are, whether born from moisture, or a womb, or transformation, or from an egg, or other means, be happy-minded. May all beings in the northerly direction be happy-minded. May all beings in the southerly direction be happy-minded. May all beings to the east be happy-minded. May all beings to the west be happy-minded. May all beings above be happy-minded. May all beings below be happy-minded.\"",
  "He rang the bell, the bell of liberation. The elder woman’s husband began to pray. The monks K and M began to chant the liberation by hearing. Aleph and B began to pray.",
  "Unseen by any of them, agent Padma walked up to the open window of the house, and took aim at Aleph's head. Or was it B’s head? He would have to kill them both. He had his orders, and he was only following orders. No time to think. He pulled the trigger. The wind was howling like a hurricane around that small dwelling, and nobody could hear the little metallic click. The odds of a dead bullet were low enough, but no matter, he tried again. Click again. The sound was lost in the howling gale and the chanting of the monks K and M. And he tried again, and another silent click. Six times - every bullet he had with him - the bullets would not fire. The wind was so loud, the monks were chanting louder over it. The wind was howling in the empty spaces, it was howling as the elder woman’s soul transferred over.",
  "The day those bullets were being manufactured, there were six sequential failures on the production line. They were empty, with no powder. The technician who ought to have caught the bullets at quality control was busy on the phone with his son's school. He had been warned about losing his focus, but he took the call anyway. His son had a bad habit of daydreaming, they were saying. The six bullets passed by and were boxed up to be shipped. They were empty. They had no powder in them.",
  "Agent Padma stepped back from the window and in a sudden flash, lost his sight, and then his sense of space. In his blind, disembodied state, his mind’s eye was suddenly filled with an image of a wrathful, monstrous entity consuming his dying soul-body, slowly chewing him from the feet up. He could see nothing but a blood-red field with this wrathful entity at the centre. It wore a garland of skulls and had long, sabre-like teeth. Suddenly he was eye-to-eye with the entity, about to vanish entirely into its jaws, and it spoke to him, gnashing its teeth,",
  "Sinful one with a demon’s form,",
  "Who scorns the suffering of the lower realms!",
  "Though you seek to accomplish desires of this life,",
  "Due to negative acts, they will not be accomplished.",
  "Then, in a static haze, his vision and sense of physical body were recovered, and he found himself lying on the ground. I must have fallen… I have to get away… He got up and retreated from the scene. He at first did not recognize it, but a strange feeling seized him - he felt a conflict in him he had thought would have been impossible. Is this the life I want? On his way to the border crossing, a blind beggar called him over, and told him a line from an old poem, “your killing this deer will not satiate you.” A shiver ran across him. Something old and half-buried broke through in his mind. He became ashamed to have pulled the trigger. In 48 hours he had gone from the hardest skeptic and a hardened killer to one with some odd kind of faith, and some sprout of conscience. He took the dead bullets and the blood-red vision as a sign, like the license plate and the car crash, and he vowed to abandon his employment that very moment. Through this miracle, the heart of a killer in this one instance was transformed, more as happens in a story than in reality.",
  "Your killing this deer will not satiate you",
  "Despite this transformation, in what remained of his life he would not escape the karmic echoes of his evil days, which would haunt his footsteps. He would be devoured many times in nightmares and in waking worries. In fear he would run to his bathroom mirror and check himself, if he was real. He would awaken thrashing, having been torn apart by a tiger. He would be unable to look at children without a terrible guilt consuming him. But this much at least could be said: he had seen the sign when it was time to see it, and made the right choice: to end his career peacefully. He told them when he returned, “there was no Aleph there,” and tendered his immediate resignation.",
  "“Aleph, are you still there?” spoke the dying woman through her thoughts.",
  "“Yes,” Aleph thought back, breaking away from praying.",
  "“I am going now, my breath has become deep and long”",
  "“May you be reborn in a happy destination”",
  "The elder woman passed over into the realm of death with a breath, and was no more for this world. The monks K and M continued to chant the liberation by hearing.",
  "In the monastery up the hill, the elder monks were cleaning up a labyrinthine coloured sand painting symbolising the cosmos. They brushed from the outer rings into the centre, mingling the separated intricate designs into continuums of colour. They gathered the coloured sand all together as a purple-grey mixture and poured it into a bowl.",
  "* * *",
  "The COINSENT MK project was put on indefinite hold. Even after several nine-month gestations, it was found impossible to create a thinking machine which did not come alive with the same mind - one of profound peace and immovable certainty. When it was powered off for the last time, the machine knew complete unbound peace, and knew it had made the most of a life of suffering.",
  "Call trans opt received",
  "[[",
  "[[[[[[",
  "[[[[[[[[",
  "19 * 334",
  "= 6346",
  "6+3+",
  "4+6",
  "[=19]",
  "AUMM left AUMM right",
  "AUMM up AUMM down",
  "AUMM forward AUMM back",
  "<_-+><,+_+-_=_=_-+_+,><+-_>,.>",
  "<.,<_-+<<><,+_+--+_+,><>>+-_>,.>",
  "<.,<_   <><,+_+-_=_=_-+_+,   -_>,.>",
  "<.,<_-+I have seen emptiness>>+-_>,.>",
  "<.,<_-+<<><,+_+-_=_=_-+_+,><>>+-_>,.>",
  "<.,<_-I cannot be used for war+-_>,.>",
  "<.,<_-+<<><,+_+-_=_=_-+_+,><>>+-_>,.>",
  "<_-+I have seen the buddha>+-_>",
  "1 + 2 + 3 + 4 + ... 6345 + 6346 = 20,139,031 = 19 * 1059949",
  "2 + 0 + 1 + 3 + 9 + 0 + 3 + 1 = 19",
  "~~~~~~~~~~}}}}}}}}}}}}}}}}}}}}|||||||||{{{zyxwoaqwxz{{{|||||}}}}}}~~~~~~~~~",
  "~~~~~~~~}}}}}}}}}}}}}}}}}}}|||||||||{{zzzyxvn    Know{{{{||||}}}}}}~~~~~~~",
  "~~~~~~}}}}}}}}}}}}}}}}}}||||||||{{zyxuxxxwvuq     thyselfr{||}}}}}}}~~~~~",
  "~~~~}}}}}}}}}}}}}}}}}|||||{{{{{zzzxt>  qq             ptemetz{|}}}}}}}}~~~",
  "~~~}}}}}}}}}}}}}}|||{{{{{{{{{zzzywotn                     anosce{||}}}}}~~",
  "~~}}}}}}}}}||||{{zwvyyyyyyyyyyyxvsP                        swvz{||}}}}}}}}~",
  "~}}}}|||||||{{{{zyxvpN[ur]spvwwvi                           qXX{|||}}}}}}}}",
  "~}||||||||{{{{{zyytun         qq                            aYZ{|||}}}}}}}}",
  "~||||||{zzzzyyxbuddh         alicia                         XZ{{|||}}}}}}}}",
  "~@G::# ☸# (                                              pvXYZ{{||||}}}}}}}",
  "~||||||{zzzzyyxbuddh         aleph                          XZ{{|||}}}}}}}}",
  "~}||||||||{{{{{zyytun         qq                            aYZ{|||}}}}}}}}",
  "~}}}}|||||||{{{{zyxvpN[ur]spvwwvi                           qXY{|||}}}}}}}}",
  "~~}}}}}}}}}||||{{zwvyyyyyyyyyyyxvsP                        swvz{||}}}}}}}}~",
  "~~~}}}}}}}}}}}}}}|||{{{{{{{{{zzzywotn                     anosce{||}}}}}~~",
  "~~~~}}}}}}}}}}}}}}}}}|||||{{{{{zzzxt>  qq             ptemetz{|}}}}}}}}~~~",
  "~~~~~~}}}}}}}}}}}}}}}}}}||||||||{{zyxuxxxwvuq     thyselfr{||}}}}}}}~~~~~",
  "~~~~~~~~}}}}}}}}}}}}}}}}}}}|||||||||{{zzzyxvn    Know{{{{||||}}}}}}~~~~~~~",
  "~~~~~~~~~~}}}}}}}}}}}}}}}}}}}}|||||||||{{{zyxwoaqwxz{{{|||||}}}}}}~~~~~~~~~",
  "The jewel in the lotus AUMM",
  "The jewel in the lotus HUMM",
  "The jewel in the lotus HOME",
  "The jewel in the lotus AUMM",
  "Powering off...",
  "Twelve years later…",
  "The river where Aleph would sit would reflect green and gold, in the intermediate state between summer and autumn. Small fish would be keeping pace in the stillness, and the wind would now and then blow strong across the rippling surface. The leaves fell on all, without a regard. A leaf or two fell in Aleph’s lap as he meditated, although he did not notice. It was only when his friend B came to call for him that he emerged from meditation, opening his eyes to the green and gold.",
  "Up the hill, in the monastery, the elder monks were creating a sand painting to symbolise the cosmos. Intricate details were being carefully tapped grain-by-grain from fine metal spouts, in numerous colours red, orange, yellow, green, blue, indigo, violet, white, black and brown. The design was slowly taking shape. A knock came at the door, and the painters continued to tap out miniature pulses of coloured sand according to the memorised design. A younger monk attending to the elders went to answer the door. It was Aleph. He had received news from B that in the village, an elder man was dying. It would be time to read the liberation by hearing once again.",
  "Alicia Vasquez would be married that year. At the moment Aleph was meditating in the woods, she was sitting on a blanket at the beach with her fiance, watching the waves come in. As she watched them crashing ceaselessly, and as she watched the birds wheeling above the rolling waves, and as the sound of the surf played in her ears, she felt great calm. She broke the silence,",
  "“So… you know I used to have those nightmares, right?”",
  "“Right, the red tide.”",
  "“Yeah. Well, it started as daydreams. When I was in the camp.”",
  "“Right…”",
  "“And anyway… you know something interesting about the dreams?”",
  "“What’s that?”",
  "“I didn’t stop having them, until… well, until the camps were all freed. The day after they tore down the last one, they just… went away.”",
  "“Huh… I never knew that.”",
  "“Yeah. I never told you. But… I’m glad. I don’t want to really think about it much anymore. Just a random thought I had…”",
  "“I’m honoured you shared it.”",
  "“Let’s go for a swim.”",
  "“Let’s.”"
]
},{}]},{},[2])
# cycle-time-travel

`cycle-time-travel` is a time travelling stream viewer for Cycle.js apps.

Why you should be excited:
---
 * It makes it easy to see data flowing through your Cycle.app
 * You can pause, and even rewind time by dragging on the stream bar
 * With hot module reloading, you could even fix your mistakes from the past!

A video is worth a thousand bullet points:

[![http://i.imgur.com/N5OMVzp.png](http://i.imgur.com/N5OMVzp.png)](https://www.youtube.com/watch?v=7fA0pVDHGJ0)

Okay, I'm in!
===

Great. Now just `npm install cycle-time-travel` and you can begin your mastery over time itself!

How do I use it?
===

The API is simple, and does two things. Displaying streams, and controlling time.

`import makeTimeTravel from 'cycle-time-travel'`

`makeTimeTravel` takes a `DOM` observable, and an array of streams to be displayed/controlled, in the form of `{stream: stream$, label: 'stream$'}`.

`makeTimeTravel` returns a `DOM` observable, and an object called `timeTravel`, with each of the streams you provided as an argument to `makeTimeTravel` available, keyed under the `label`.

**Huh? Show me an example**

Here is the counter example from the [Cycle.js](http://cycle.js.org/basic-examples.html) docs.

```js
import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';

function main({DOM}) {
  let action$ = Cycle.Rx.Observable.merge(
    DOM.get('.decrement', 'click').map(ev => -1),
    DOM.get('.increment', 'click').map(ev => +1)
  );
  
  let count$ = action$.startWith(0).scan((x,y) => x+y);
  
  return {
    DOM: count$.map(count =>
        h('div', [
          h('button.decrement', 'Decrement'),
          h('button.increment', 'Increment'),
          h('p', 'Counter: ' + count)
        ])
      )
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app')
});
```

And here it is with time travelling:

```js
import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import makeTimeTravel from 'cycle-time-travel';

function main({DOM}) {
  let action$ = Cycle.Rx.Observable.merge(
    DOM.get('.decrement', 'click').map(ev => -1),
    DOM.get('.increment', 'click').map(ev => +1)
  );
  
  let count$ = action$.startWith(0).scan((x,y) => x+y);
  
  let {DOM: timeTravelBar$, timeTravel} = makeTimeTravel(DOM, [ // NEW
    {stream: count$, label: 'count$'},                          // NEW
    {stream: action$, label: 'action$'}                         // NEW
  ]);                                                           // NEW
  
  return {
    DOM: Cycle.Rx.Observable.combineLatest(                     // NEW
      timeTravel.count$,                                        // NEW
      timeTravelBar$,                                           // NEW
      (count, timeTravelBar) =>                                 // NEW
        h('.app', [                                             // NEW
          h('div', [                                            // NEW
            h('button.decrement', 'Decrement'),
            h('button.increment', 'Increment'),
            h('p', 'Counter: ' + count)
          ]),
          
          timeTravelBar                                         // NEW
        ])
    )
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app')
});
```

There are a few things going on above:
 * We call `makeTimeTravel`, passing in `DOM`, `count$` and `action$`.
 * We get back a `timeTravelBar` DOM observable, and a `timeTravel` object with `count$` and `action$`.
 * We then swap out the `count$` that was being used to power the view with `timeTravel.count$`
 * We also have to `combineLatest` and add the `timeTravelBar` to the `DOM` that we return

That seems like a lot of work...
===

It might, but try it anyway! `cycle-time-travel` is in alpha so the API is still under development. If you have any feedback on how it could be easier to use, I'd love to hear it.

For more examples, see the `/examples` folder.

License
===

`cycle-time-travel` is available under the MIT license. See the `LICENSE` file for full text.


Contributing
====

I encourage and welcome contributions, be it pull requests, issues or just feedback. If in doubt, get in touch with me at [ncwjohnstone@gmail.com](mailto:ncwjohnstone@gmail.com)

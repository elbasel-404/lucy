# React Hooks: Simplifying State and Side Effects in Functional Components

Okoro Emmanuel Nzube

Hooks allow function components to have access to state and other React features, such as lifecycle methods. These Hook features were introduced to React version 16.8.

One of the interesting things about the Hook features is that they let you use React without classes. This, in turn, helps simplify your codebase and helps you write cleaner and more intuitive code.

In this article, you will learn how to make use of the common Hooks in your project.

## React Hooks Benefits

Let's go over some of the reasons why you might want to use Hooks in your project:

*   **Easy to use and understand**: With Hooks, you can write more straightforward code. These Hook commands can only be written inside a functional component.
*   **Reusable code**: Hooks allow you to reuse particular logic used in one component across multiple other components.
*   **Better optimization performance**: Hooks offer a more efficient approach to utilizing React functionalities like state and lifecycle functions, resulting in improved performance as compared to class components in some situations.

## Different Types of React Hooks

The React Hook features are of different types, ranging from `useState`, `useEffect`, `useRef`, `useReducer`, and so on.

## React Hook Rules

There are a few important rules when it comes to the React Hook features that should be strictly followed. Let's go over them in the following sections.

### Hooks should be called inside a React function

Hooks should not be used inside a class component – they can and should only be called inside the React function.

This first rule essentially specifies that a Hook component should not be found in a class component, but in a functional component.

Here is the wrong way of implementing the Hook feature:

```jsx
import React, { Component } from 'react';

import React, {useState} from react;

class App extends Component {
  const [count, setCount] = useState(0);

  render() {
    return (
      <div>
        <h1>Hello, I am a Class Component!</h1>
      </div>
    );
  }
}

export default App;
```

And here is the correct way of implementing the Hook feature:

```jsx
import React, { useState } from 'react';

function App() {
  const [userName, setUsername] = useState('');

  return ( /* Your JSX code goes in here..... */ );
}

export default App;
```

The code example above shows a proper way of using a Hook feature.

If you use a Hook feature in a class component, just like in the first example, your code will raise an error. Therefore, you can only implement a Hook inside a function component.

### Hooks can only be called at the top level of a component

You can only implement/call a React Hook at the top level of a component before any other code.

Using the code from the previous section as an example, you can see that immediately after `function App ()`, the next thing that comes is the Hook command – in that example we used the `useState` Hook. That is what the second rule is all about.

### Hooks cannot be used in a conditional statement

We have different types of conditional statements/rendering ranging from `if`, `else`, and so on.

The above rule means that conditionals cannot be applied directly to Hooks. This is the case because Hooks are called in the same order on every render of a functional component.

You can conditionally run Hooks within a functional component, but for this to work, this condition must be determined by top-level logic and should not be nested within any other blocks or components.

The reason for this is because Hooks need to be invoked at the highest level of the component, rather than under conditions, loops, or nested functions.

Here is an example:

```jsx
import React, { useState, useEffect } from 'react';

function ConditionalEffectComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isMounted) {
      // Perform some effect when the component is mounted
      console.log('Component mounted');
    }
  }, [isMounted]); // Dependency array ensures effect runs when isMounted changes

  return (
    <div>
      <button onClick={() => setIsMounted(!isMounted)}>
        {isMounted ? 'Unmount' : 'Mount'}
      </button>
    </div>
  );
}

export default ConditionalEffectComponent;
```

From the example above, the `useEffect` hook is executed conditionally dependent on the value of the `isMounted` state variable.

Clicking the button causes the value of `isMounted` to alternate, either activating or deactivating the effect depending on the updated value.

This is deemed appropriate because the Hook is invoked at the highest level of the component and its condition is determined by the overarching logic within the component.

## How to Use the useState Hook

The React `useState` Hook enables you to have state variables in functional components.

To make use of the state Hook, you must first import it into your project by using the `import` command.

The way `useState` works is that it gives us two variables. The first variable is known as the value of the state, and the second variable is a function used to update the state.

Here is an example of how to go about this:

```jsx
import './App.css'
import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}> Click me
      </button>
    </div>
  );
}

export default App;
```

From the code example above, you can see that the state Hook was used in a functional component and not a class component.

`count` and `setCount` are the two variables of the state Hook, where `count` is the current value of the state and `setCount` is used to update the value of the state. Therefore, whenever the button is clicked, `setCount` will update the value of the `count`.

### How useState Hook works

The `useState` hook essentially provides a way to declare state variables in functional components. When you call `useState(initialValue)`, it returns an array containing two elements:

1.  **Current State Value**: This is the current value of the state variable. In our example, it's `count`.
2.  **State Updater Function**: This is a function that you can call to update the state variable. When you call `setCount(newValue)`, React will re-render the component with the new `count` value.

## How to Use the useEffect Hook

The `useEffect` hook in React is like a handy tool for functional components. It helps manage tasks that aren't directly related to showing stuff on the screen, like fetching data from the internet, retrieving data from API endpoints, or setting up timers. It can be used to update components even after they've been shown, making your app more dynamic.

Here's a basic example of how `useEffect` is used to fetch data from an API endpoint:

```jsx
import React, { useState, useEffect } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://api.example.com/data');
        const jsonData = await response.json();
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData(); // Call the fetchData function when the component mounts or updates

    // Cleanup function (optional) to handle unsubscriptions or resource cleanup
    return () => {
      // Cleanup logic here, if needed
    };
  }, []); // Empty dependency array means the effect runs only once after the initial render

  return (
    <div>
      {/* Render the fetched data */}
      {data && (
        <ul>
          {data.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyComponent;
```

In the code example above, `MyComponent` is a functional component which utilizes React hooks, specifically `useState` and `useEffect`, to handle state management and execute side effects. The `useState` hook is used to initialize a state variable called `data`. This variable will store the data retrieved from an API endpoint.

The `useEffect` hook is used to request data from the API endpoint once the component initially renders. Within the `useEffect`, an asynchronous function `fetchData` is defined to fetch JSON data from the specified API endpoint using the `fetch` API.

If the data fetching is successful, the returned JSON data is saved in the `data` state variable using the `setData` function supplied by the `useState` hook.

The `useEffect` hook also optionally returns a cleaning function, which is currently empty but can be used for any necessary cleanup logic.

In the component's JSX, the fetched data is conditionally rendered. If the `data` is not `null`, a list `<ul>` is produced using items extracted from the `data` array using `map`.

Finally, the `MyComponent` function is exported as the default export from the module, allowing it to be imported and utilized in other sections.

## Conclusion

As a developer, React Hooks are a very useful and powerful tool for functional components that make your work easy.

I believe that at this point you now know what a React Hook is and how to use the most popular ones.

Thanks for reading, and happy coding!

---

Okoro Emmanuel Nzube

I am a committed front-end web developer, a Freelancer. I am diligent in whatever I put my mind to.

If you read this far, thank the author to show them you care. [Say Thanks](#)

[Learn to code for free. freeCodeCamp's open source curriculum has helped more than 40,000 people get jobs as developers. Get started](#)

ADVERTISEMENT
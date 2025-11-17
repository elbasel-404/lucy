# useActionState

useActionState is a Hook that allows you to update state based on the result of a form action.

```js
const [state, formAction, isPending] = useActionState(fn, initialState, permalink?);
```

**Note:** In earlier React Canary versions, this API was part of React DOM and called useFormState.

## Reference

`useActionState(action, initialState, permalink?)`

## Usage

Using in
// @ts-check
"use strict"

import React from 'react'
import { useMagicState, useMagicEffect, toValue } from "./magic-hooks"
import './App.css'

// From https://react.dev/learn/reusing-logic-with-custom-hooks#challenges
export default function App() {
  const [delay, setDelay] = useMagicState(1000);
  const count = useCounter(delay)

  useInterval(() => {
    const randomColor = `hsla(${Math.random() * 360}, 100%, 50%, 0.2)`;
    document.body.style.backgroundColor = randomColor;
  }, 2000);

  return (
    <>
      <label>
        Tick duration: {delay()} ms
        <br />
        <input
          type="range"
          value={delay()}
          min="10"
          max="2000"
          step="10"
          onChange={e => setDelay(Number(e.target.value))}
        />
      </label>
      <hr />
      <h1>Ticks: {count()}</h1>
    </>
  )
}

/** 
  * @param {import('./magic-hooks').ValueOrGetter<number>} delay
  */
function useCounter(delay = 1000) {
  const [count, setCount] = useMagicState(0)

  useInterval(() => {
    setCount(c => c + 1);
  }, delay);

  return count
}

/** 
  * @param {() => void} callback
  * @param {import('./magic-hooks').ValueOrGetter<number>} delay
  */
function useInterval(callback, delay = 1000) {
  useMagicEffect(() => {
    const id = setInterval(callback, toValue(delay));
    return () => clearInterval(id);
  })
}

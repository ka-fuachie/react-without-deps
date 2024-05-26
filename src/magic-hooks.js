// @ts-check
"use strict"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
  * @template S
  * @param {S | (() => S)} initialState
  */
export function useMagicState(initialState) {
  const [value, setValue] = useState(initialState)
  const source = useSource(value)

  return /** @type {const} */([ source.getter, setValue ])
}

/**
  * @param {React.EffectCallback} callback
  */
export function useMagicEffect(callback) {
  const sink = useSink()
  useEffect(() => sink.update(callback), [sink.updateId])
}

/**
  * @template T
  * @param {() => T} factory
  */
export function useMagicMemo(factory) {
  const sink = useSink()
  const value = useMemo(() => sink.update(factory), [sink.updateId])
  const source = useSource(value)

  return source.getter
}

/**
  * @template {Function} T
  * @param {T} callback
  */
export function useMagicCallback(callback) {
  throw new Error("Not implemented")
}

/**
  * @template {(...args: any[]) => any} T
  * @param {T} fn
  */
export function sample(fn) {
  return runWithSink(null, fn)
}

/** 
  * @template V
  * @param {ValueOrGetter<V>} value
  */
export function toValue(value) {
  if(isFunction(value)) return value()
  return value
}

/** 
  * @template V
  * @typedef {V | (() => V)} ValueOrGetter
  */

/**
  * @template [S = unknown]
  * @typedef {Object} Source
  * @property {S | (typeof INITIAL_SOURCE_VALUE)} prevValue
  * @property {boolean} hasChanged
  * @property {() => S} getter
  */

/**
  * @typedef {Object} Sink
  * @property {Set<Source>} dependencies
  * @property {number} updateId
  */

const INITIAL_SOURCE_VALUE = Symbol("INITIAL_SHINY_STATE_VALUE")
/** @type {Sink | null} */
let activeSink = null

/**
  * @template S
  * @param {S} value
  */
function useSource(value) {
  /** @type {React.MutableRefObject<Source<S>>} */
  // @ts-ignore
  const sourceRef = useRef({
    prevValue: INITIAL_SOURCE_VALUE,
    hasChanged: false,
    getter: () => INITIAL_SOURCE_VALUE,
  })

  sourceRef.current.prevValue = sourceRef.current.getter() // TODO: maybe sample it
  sourceRef.current.hasChanged = (
    !Object.is(INITIAL_SOURCE_VALUE, sourceRef.current.prevValue) &&
    !Object.is(value, sourceRef.current.prevValue)
  )

  if(!Object.is(value, sourceRef.current.prevValue)) {
    sourceRef.current.getter = () => {
      activeSink?.dependencies.add(sourceRef.current)
      return value
    }
  }

  return { getter: sourceRef.current.getter }
}

function useSink() {
  /** @type {React.MutableRefObject<Sink>} */
  const sinkRef = useRef({
    dependencies: new Set(),
    updateId: 0,
  })

  if(needsUpdate(sinkRef.current)) sinkRef.current.updateId++

  /**
    * @template {(...args: any[]) => any} T
    * @param {T} callback
    */
  function update(callback) {
    sinkRef.current.dependencies.clear()
    return runWithSink(sinkRef.current, callback)
  }

  return { update, updateId: sinkRef.current.updateId }
}

/**
  * @param {unknown} value
  * @returns {value is Function}
  */
function isFunction(value) {
  return typeof value === "function"
}

/**
  * @template {(...args: any[]) => any} T
  * @param {Sink?} sink
  * @param {T} callback
  */
function runWithSink(sink, callback) {
  const prevActiveSink = activeSink
  /** @type {ReturnType<T>} */
  let result

  activeSink = sink
  try {
    result = callback()
  } finally {
    activeSink = prevActiveSink
  }

  return result
}

/**
  * @param {Sink} sink
  */
function needsUpdate(sink) {
  if(Object.is(0, sink.updateId)) return true

  for(const source of sink.dependencies) {
    if(source.hasChanged) return true
  }
  return false
}

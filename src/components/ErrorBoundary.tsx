"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded bg-red-50 text-sm text-red-600">
          <p className="mb-2">Что-то пошло не так</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="underline"
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

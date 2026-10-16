import { Component, type ReactNode } from "react";

/** Fanger nedbrud inde i Google-kortet, så rutekørslen skifter til reservekortet i stedet for en fejlskærm. */
export class MapCrashGuard extends Component<{ children: ReactNode; onCrash: (err: Error) => void }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: Error) { this.props.onCrash(err); }
  render() { return this.state.crashed ? null : this.props.children; }
}

export class ApprovalGate {
  private state: 'pending' | 'checking' | 'canceled' | 'broadcasting' | 'done' = 'pending';
  begin() { if (this.state !== 'pending') throw new Error('This proposal has already been used or canceled. Review a new payment.'); this.state = 'checking'; }
  assertChecking() { if (this.state !== 'checking') throw new Error('Payment review was canceled. No transaction will be submitted.'); }
  cancel() { if (this.state === 'pending' || this.state === 'checking') this.state = 'canceled'; }
  broadcast() { this.assertChecking(); this.state = 'broadcasting'; }
  finish() { this.state = 'done'; }
}

import React, {Component} from 'react';
import ERC20 from '../../contracts/ERC20.json';
import {getUsdValue} from '../../utils/helpers';

class Asset extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: this.props.token,
      balance: null,
      usdValue: 0,
      realBalance: null
    }
  }

  componentDidMount = async () => {
    await this.getBalance();
    const usdValue = await getUsdValue(this.state.token.address, this.state.realBalance);
    this.setState({usdValue});
  }

  componentWillReceiveProps = async (nextProps) => {
    await this.setState({token: nextProps.token});
    await this.getBalance();
    const usdValue = await getUsdValue(this.state.token.address, this.state.realBalance);
    this.setState({usdValue});
  }

  getDecimals = async () => {
    if(this.state.token.address !== '0x0000000000000000000000000000000000000000') {
      const token = await new this.props.web3.eth.Contract(
        ERC20, this.state.token.address
      );
      const decimals = await token.methods.decimals().call();
      return decimals;
    }
  }

  fromWeiDecimals = (amount, decimals) => {
    const finalAmount = amount/10**decimals;
    return finalAmount;
  }

  getBalance = async () => {
    const decimals = await this.getDecimals();
    let balance;

    if(decimals && decimals !== '18') {
      balance = this.fromWeiDecimals(this.state.token.balance, decimals);
    } else {
      balance = this.props.web3.utils.fromWei(this.state.token.balance);
    }

    this.setState({realBalance: balance});

    let fixedBalance;  
    if(balance < 0.001) {
      fixedBalance = '<0.001';
    } else {
      fixedBalance = Math.round((parseFloat(balance) + Number.EPSILON) * 1000) / 1000;
    }

    this.setState({balance: fixedBalance});
  }

  render() {
    return (
      <li className="assets__asset">
        <img 
          src={this.props.allTokens[this.state.token.address].logo} 
          alt="Logo"
          className="assets__asset-logo" />
        <p className="assets__asset-info">
          {this.props.allTokens[this.state.token.address].symbol}
        </p>
        <p className="assets__asset-info assets__asset-info--amount">
          {this.state.balance}/{`$${this.state.usdValue}`}
        </p>
      </li>
    );
  }
}

export default Asset;
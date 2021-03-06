import React, {Component} from 'react';
import Button from '../Shared/Button';
import Warning from '../Shared/Warning';
import TokenInputDropdown from './TokenInputDropdown';
import ERC20 from '../../contracts/ERC20.json';
import down from '../../assets/down-arrow.svg';

import '../../layout/components/deposit.sass';

class DepositWithdrawForm extends Component {
  state = {
    token: '0x0000000000000000000000000000000000000000',
    searchToken: this.props.searchToken,
    amount: '',
    approve: false,
    renderDropdown: false,
    className: this.props.deposit ? 'deposit' : 'withdraw',
    deposit: this.props.deposit,
    balance: 0
  }

  componentDidMount = () => {
    this.getBalance();
    this.disableButton();
  }

  componentWillReceiveProps = (nextProps) => {
    this.setState({renderDeposit: nextProps.renderDeposit});
    this.setState({searchToken: nextProps.searchToken});
  }

  handleAmountChange = async (e) => {
    await this.setState({amount: e.target.value});
    await this.getTokenAllowance();
    this.disableButton();
  }

  setToken = async (token, symbol) => {
    await this.setState({token});
    await this.getTokenAllowance();
    this.props.handleSearchTokenChange(null, '');
    this.getBalance();
    this.disableButton();
  }

  toggleDropdown = async () => {
    if(this.state.renderDropdown) {
      this.setState({renderDropdown: false});
    } else {
      await this.setState({renderDropdown: true});
      const tokenInput = document.querySelector('.token-input__search');
      tokenInput.focus();
    }
  }

  getDecimals = async () => {
    if(this.state.token !== '0x0000000000000000000000000000000000000000') {
      const token = await new this.props.web3.eth.Contract(
        ERC20, this.state.token
      );
      const decimals = await token.methods.decimals().call();
      return decimals;
    }
  }

  toWeiDecimals = (amount, decimals) => {
    const finalAmount = amount*10**decimals;
    return finalAmount;
  }

  disableButton = () => {
    if(this.props.deposit) {
      const depositButtons = Array.from(document.querySelectorAll('.deposit__button'));
      if(this.state.approve) {
        depositButtons.forEach(button => {
          if(!button.classList.contains('disabled')) {
            button.disabled = true;
            button.classList.add('disabled');
          }
        });
      } else {
        depositButtons.forEach(button => {
          if(button.classList.contains('disabled')) {
            button.disabled = false;
            button.classList.remove('disabled');
          }
        });
      }
    } else {
      const withdrawButtons = Array.from(document.querySelectorAll('.deposit__button'));
      if(this.state.amount > this.state.balance) {
        withdrawButtons.forEach(button => {
          if(!button.classList.contains('disabled')) {
            button.disabled = true;
            button.classList.add('disabled');
          }
        });
      } else {
        withdrawButtons.forEach(button => {
          if(button.classList.contains('disabled')) {
            button.disabled = false;
            button.classList.remove('disabled');
          }
        });
      }
    }
  }

  handleDepositSubmit = async (e) => {
    e.preventDefault();

    const decimals = await this.getDecimals();
    let amount;

    if(decimals && decimals !== '18') {
      amount = this.props.web3.utils.toHex(this.toWeiDecimals(this.state.amount, decimals));
    } else {
      amount = this.props.web3.utils.toHex(this.props.web3.utils.toWei(this.state.amount));
    }

    let sendAmount;

    if(this.state.token === '0x0000000000000000000000000000000000000000') {
      sendAmount = amount;
    } else {
      sendAmount = 0;
    }

    await this.props.fund.methods.deposit(
      amount,
      this.state.token
    ).send({
      from: this.props.address,
      value: sendAmount
    }, (err, txHash) => {
      this.props.setMessage('Transaction Pending...', txHash);
      this.props.closeDepositModal();
    }).on('confirmation', (number, receipt) => {
      if(number === 0) {
        this.props.setMessage('Transaction Confirmed!', receipt.txHash);
        this.props.getAssets();
        setTimeout(() => {
          this.props.clearMessage();
        }, 10000);
      }
    }).on('error', (err, receipt) => {
      this.props.setMessage('Transaction Failed.', receipt ? receipt.transactionHash : null);
      setTimeout(() => {
        this.props.clearMessage();
      }, 10000);
    });
  }

  handleWithdrawSubmit = async (e) => {
    e.preventDefault();

    const decimals = await this.getDecimals();
    let amount;

    if(decimals && decimals !== '18') {
      amount = this.props.web3.utils.toHex(this.toWeiDecimals(this.state.amount, decimals));
    } else {
      amount = this.props.web3.utils.toHex(this.props.web3.utils.toWei(this.state.amount));
    }

    await this.props.fund.methods.withdraw(
      amount,
      this.state.token
    ).send({
      from: this.props.address
    }, (err, txHash) => {
      this.props.setMessage('Transaction Pending...', txHash);
      this.props.closeWithdrawalModal();
    }).on('confirmation', (number, receipt) => {
      if(number === 0) {
        this.props.setMessage('Transaction Confirmed!', receipt.txHash);
        this.props.getAssets();
        setTimeout(() => {
          this.props.clearMessage();
        }, 10000);
      }
    }).on('error', (err, receipt) => {
      this.props.setMessage('Transaction Failed.', receipt ? receipt.transactionHash : null);
      setTimeout(() => {
        this.props.clearMessage();
      }, 10000);
    });
  }

  getTokenAllowance = async () => {
    if(this.state.token === '0x0000000000000000000000000000000000000000') {
      return this.setState({approve: false});
    }
    
    const token = await new this.props.web3.eth.Contract(
      ERC20, this.state.token
    );

    const allowance = await token.methods.allowance(
      this.props.address, 
      this.props.fund._address
    ).call()
    
    if(allowance < this.state.amount) {
      this.setState({approve: true});
    } else {
      this.setState({approve: false});
    }
  }

  approveToken = async () => {
    const token = await new this.props.web3.eth.Contract(
      ERC20, this.state.token
    );

    token.methods.approve(
      this.props.fund._address,
      this.props.web3.utils.toWei(this.state.amount)
    ).send({from: this.props.address}, (err, txHash) => {
      this.props.setMessage('Transaction Pending...', txHash);
    }).on('confirmation', async (number, receipt) => {
      if(number === 0) {
        this.props.setMessage('Transaction Confirmed!', receipt.txHash);
        setTimeout(() => {
          this.props.clearMessage();
        }, 10000);
      }
      await this.setState({approve: false});
      this.disableButton();
    }).on('error', (err, receipt) => {
      this.props.setMessage('Transaction Failed.', receipt ? receipt.transactionHash : null);
      setTimeout(() => {
        this.props.clearMessage();
      }, 10000);
    });
  }

  infiniteApproveToken = async () => {
    const token = await new this.props.web3.eth.Contract(
      ERC20, this.state.token
    );

    token.methods.approve(
      this.props.fund._address,
      // 2147483647 = Javascript max safe integer
      this.props.web3.utils.toWei('2147483647')
    ).send({from: this.props.address}, (err, txHash) => {
      this.props.setMessage('Transaction Pending...', txHash);
    }).on('confirmation', async (number, receipt) => {
      if(number === 0) {
        this.props.setMessage('Transaction Confirmed!', receipt.txHash);
        setTimeout(() => {
          this.props.clearMessage();
        }, 10000);
      }
      await this.setState({approve: false});
      this.disableButton();
    }).on('error', (err, receipt) => {
      this.props.setMessage('Transaction Failed.', receipt ? receipt.transactionHash : null);
      setTimeout(() => {
        this.props.clearMessage();
      }, 10000);
    });
  }

  fromWeiDecimals = (amount, decimals) => {
    const finalAmount = amount/10**decimals;
    return finalAmount;
  }

  getBalance = () => {
    this.props.userAssets.forEach(async (asset) => {
      if(asset.address === this.state.token) {
        const decimals = await this.getDecimals();
        let balance;
        if(decimals && decimals !== '18') {
          balance = this.fromWeiDecimals(asset.balance, decimals);
        } else {
          balance = this.props.web3.utils.fromWei(asset.balance);
        }

        return this.setState({balance});
      }
    });

    this.setState({balance: 0});
  }

  setMaxAmount = async () => {
    this.setState({amount: this.state.balance});
  }

  render() {
    return (
      <div className={`deposit`}>
        <h2 className={`deposit__header`}>{this.state.deposit ? 'Deposit' : 'Withdraw'} Token</h2>
        <form 
          onSubmit={this.state.deposit ? this.handleDepositSubmit : this.handleWithdrawSubmit} 
          className={`deposit__form`}>
          <label className={`deposit__label`}>
            Token
            <button
              type="button"
              className={`deposit__token-button`}
              onClick={this.toggleDropdown}
            >
              <img 
                src={this.props.allTokens[this.state.token].logo}
                alt="Logo"
                className={`deposit__token-button-logo`} />
              {this.props.allTokens[this.state.token].symbol}
              <img
                src={down}
                alt="Carat"
                className={`deposit__token-button-carat`} />
            </button>
            {this.state.renderDropdown &&
              <TokenInputDropdown
                searchToken={this.state.searchToken}
                setToken={this.setToken}
                allTokens={this.props.allTokens}
                tokenList={this.props.tokenList}
                handleSearchTokenChange={this.props.handleSearchTokenChange} />
            }
          </label>
          <label className={`deposit__label`}>
            Amount
            <input 
              type="number"
              className={`deposit__input`}
              placeholder="Amount"
              onChange={this.handleAmountChange}
              value={this.state.amount}
            />
          </label>
          {this.state.approve && this.state.deposit &&
            <div className={`deposit__unlocks`}>
              <button 
                type="button" 
                onClick={this.approveToken}
                className={`deposit__unlock`}>
                  Unlock {this.state.amount}
              </button>
              <button 
                type="button" 
                onClick={this.infiniteApproveToken}
                className={`deposit__unlock`}>
                  Infinite Unlock
              </button>
            </div>
          }
          {!this.state.deposit && this.state.token &&
            <button 
              type="button" 
              onClick={this.setMaxAmount}
              className="deposit__unlock">
              Max: {this.state.balance}
            </button>
          }
          <Button 
            text={this.state.deposit ? 'Deposit' : 'Withdraw'}
            class={`solid deposit__button`}
            link={null} 
            button={true}
          />
          {this.props.deposit &&
            <Warning 
              className="deposit__warning"
              message={
                `Locking ${this.state.amount} 
                ${this.props.allTokens[this.state.token].symbol} 
                until ${this.props.expiration}.`}/>
          }
        </form>
      </div>
    );
  }
}

export default DepositWithdrawForm;
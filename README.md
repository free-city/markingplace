# CertiK Verified on Sept 15th, 2022

TABLE OF CONTENTS |  ``FREECITY``



Findings:

1.Usage of `transfer`/`send` for sending Ether
```shell
ECF-01 : It has been changed,replace to sendValue
```

2.Missing Upper Bound For Fees
```shell
ECF-02 : It has been changed,add type(uint16).max as limit
```

3.Centralization Risks in `FreeCityGame_v2.sol` and `MyToken.sol`
```shell
FCC-01 : no change ,Our project is currently not fully decentralized
```

4.Centralization Risks in `Proxy Contracts` and `ExchangeCore.sol`
```shell
FCC-02 : no change , because only exchangecore has the role, user can revoke the authertication , That's no security risk
```

5.Potential Reentrancy Attack
```shell
FCC-03 : It has been changed, but it is unnecessary, because no call out contract
```

6.Missing Zero Address Validation
```shell
FCC-04 : It has been changed, add zero address judgment
```

7.Missing Error Messages
```shell
FCC-07 : It has been changed, Error Messages with require added
```

8.Redundant Code Components
```shell
FCC-08 : It has been changed, Deleted
```

9.Missing Emit Events
```shell
FCC-09 : It has been changed, Added some events
```
10.Dead Code
```shell
FCC-10 : It has been changed, Dead Code Deleted
```

11.Unused Event
```shell
FCC-11 : It has been changed, Unused Event Deleted
```

12.`transferFrom()` in `ERC20.sol` Has No Implementation
```shell
FCC-12 : no change, ERC20 contract only serve test env
```

13.Centralized Control of Contract Upgrade
```shell
FCG-01 : no change, Our project is currently not fully decentralized
```

14.Lack Of Access Control
```shell
FCG-02 : It has been changed,  add access role control
```

15.Comparison to Boolean Constant
```shell
FCG-06 : It has been changed,require judge false or true
```

16.Typo
```shell
FCG-07 : It has been changed, blindBoxBaseUrl -> blindBoxBaseUri
```

17.Unused Contract
```shell
FCK-02 : no change,  test use
```

18.`calculateFinalPrice()` is Unclear
```shell
SKI-01 : It has been changed, remove it
```

19.Misleading Function Name
```shell
TRF-01 : no change
```

20.Improper Usage of `public` and `external` Type
```shell
FCC-05 : Part has changed
```

21.State Variable Should Be Declared `constant`
```shell
FCC-06 : no change  
```

22.User-Defined Getters
```shell
FCG-03 : no change  
```

23.Unused State Variables
```shell
FCG-04 : It has been changed, remove unuse state Variables
```

24.Costly Operation Inside Loop
```shell
FCG-05 : It has been changed, use local variales
```

25.Unnecessary Use of SafeMath
```shell
FCK-01 : no change
```



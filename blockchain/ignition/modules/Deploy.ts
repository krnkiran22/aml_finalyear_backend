import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('ChainGuardDeploy', (m) => {
  const oracleAddress = m.getParameter(
    'oracleAddress',
    '0x0000000000000000000000000000000000000000',
  );

  const amlRegistry = m.contract('AMLRegistry', [oracleAddress]);
  const transactionMonitor = m.contract('TransactionMonitor', [oracleAddress]);

  return { amlRegistry, transactionMonitor };
});

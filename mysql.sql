drop table if exists ENTRY_POINT_CONFIG;

create table ENTRY_POINT_CONFIG (
    id bigint(32) unsigned auto_increment primary key,
    address char(255) not null comment 'entry point address',
    support_chains text comment 'support chainIds',
    uo_event_topic char(255) not null comment 'UserOperationEvent topic',
    account_deployed_topic char(255) not null comment 'AccountDeployed topic',
    uo_revert_reason_topic char(255) not null comment 'UserOperationRevertReason topic',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(address)
) engine=innodb default charset=utf8;


drop table if exists SCAN_CONFIG;

create table SCAN_CONFIG (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    scan_url char(255) not null comment 'scan url',
    api_key char(255) not null comment 'api key',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id, scan_url)
) engine=innodb default charset=utf8;

-- event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed);
drop table if exists ENTRY_POINT_LOGS;

create table ENTRY_POINT_LOGS (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'log address',
    userOpHash char(255) not null  comment 'log userOpHash',
    sender char(255) not null comment 'log sender',
    paymaster char(255) comment 'log paymaster',
    nonce char(255) comment 'log nonce',
    success char(255) comment 'log success',
    actualGasCost char(255) comment 'log actualGasCost',
    actualGasUsed char(255) comment 'log actualGasUsed',
    blockNumber char(255) comment 'log blockNumber',
    blockHash char(255) comment 'log blockHash',
    timeStamp char(255) comment 'log timeStamp',
    gasPrice char(255) comment 'log gasPrice',
    gasUsed char(255) comment 'log gasUsed',
    logIndex char(255) comment 'log logIndex',
    transactionHash char(255) not null comment 'log transactionHash',
    transactionIndex char(255) comment 'log transactionIndex',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,userOpHash,transactionHash)
) engine=innodb default charset=utf8;

-- event UserOperationRevertReason(bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason);
drop table if exists REVERT_REASON_LOGS;

create table REVERT_REASON_LOGS (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'log address',
    userOpHash char(255) not null  comment 'log userOpHash',
    sender char(255) not null comment 'log sender',
    nonce char(255) not null comment 'log nonce',
    revertReason text comment 'log revertReason',
    transactionHash char(255) not null comment 'log transactionHash',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,userOpHash,transactionHash)
) engine=innodb default charset=utf8;

-- event AccountDeployed(bytes32 indexed userOpHash, address indexed sender, address factory, address paymaster);
drop table if exists ACCOUNT_DEPLOYED_LOGS;

create table ACCOUNT_DEPLOYED_LOGS (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'log address',
    userOpHash char(255) not null comment 'log userOpHash',
    sender char(255) not null comment 'log sender',
    factory char(255) not null comment 'log factory',
    paymaster char(255) not null comment 'log paymaster',
    transactionHash char(255) not null comment 'log transactionHash',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,userOpHash,transactionHash)
) engine=innodb default charset=utf8;


drop table if exists ENTRY_POINT_TXS;

create table ENTRY_POINT_TXS (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'EntryPoint address',
    hash char(255) not null comment 'tx hash',
    nonce char(255) comment 'tx nonce',
    blockNumber char(255) comment 'tx blockNumber',
    blockHash char(255) comment 'tx blockHash',
    transactionIndex char(255) comment 'tx transactionIndex',
    tx_from char(255) comment 'tx from',
    tx_to char(255) comment 'tx to',
    value char(255) comment 'tx value',
    timeStamp char(255) comment 'tx timeStamp',
    gas char(255) comment 'tx gasUsed',
    gasPrice char(255) comment 'tx gasPrice',
    isError char(10) comment 'tx isError',
    txreceipt_status char(10) comment 'tx txreceipt_status',
    input text comment 'tx input',
    contractAddress char(255) comment 'tx contractAddress',
    cumulativeGasUsed char(255) comment 'tx cumulativeGasUsed',
    gasUsed char(255) comment 'tx gasUsed',
    confirmations char(255) comment 'tx confirmations',
    methodId char(255) comment 'tx methodId',
    functionName char(255) comment 'tx functionName',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,hash)
) engine=innodb default charset=utf8;


drop table if exists USER_OPERATION_INFO;

create table USER_OPERATION_INFO (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'log address',
    transactionHash char(255) not null comment 'log transactionHash',
    sender char(255) not null comment 'log sender',
    nonce char(255) not null comment 'log nonce',
    initCode text comment 'log initCode',
    callData text comment 'log callData',
    callGasLimit char(255) comment 'log callGasLimit',
    verificationGasLimit char(255) comment 'log verificationGasLimit',
    preVerificationGas char(255) comment 'log preVerificationGas',
    maxFeePerGas char(255) comment 'log maxFeePerGas',
    maxPriorityFeePerGas char(255) comment 'log maxPriorityFeePerGas',
    paymasterAndData text comment 'log paymasterAndData',
    signature text comment 'log signature',
    beneficiary char(255) comment 'log beneficiary',
    factory char(255) comment 'log factory',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,transactionHash,sender,nonce)
) engine=innodb default charset=utf8;


drop table if exists ENTRY_POINT_INTERNAL_TXS;

create table ENTRY_POINT_INTERNAL_TXS (
    id bigint(32) unsigned auto_increment primary key,
    chain_id int not null comment 'chain id',
    address char(255) not null comment 'log address',
    transactionHash char(255) not null comment 'log transactionHash',
    internalTxs text comment 'internalTxs',
    created_at timestamp NULL DEFAULT NULL,
    updated_at timestamp NULL DEFAULT NULL,
    unique key locker_event_unique(chain_id,address,transactionHash)
) engine=innodb default charset=utf8;
